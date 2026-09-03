package app.helssu.twa;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Collections;
import java.util.List;

/**
 * 구글 플레이 인앱결제 브리지 — 로드맵 7.1.
 *
 * 🔴 이 플러그인은 **구매 토큰만** 웹에 돌려준다. "구독 중인지·언제까지인지" 는 절대
 * 여기서 정하지 않는다 — 서버가 구글 서버에 직접 물어본다. 앱은 뜯어보기 쉬워서,
 * 앱이 말하는 "구독 중" 을 믿으면 누구나 프리미엄이 된다.
 *
 * 🔴 **수령 확인(acknowledge)도 여기서 하지 않는다.** 서버가 검증에 성공하고 저장까지
 * 끝낸 뒤에 한다. 앱이 먼저 확인해 버리면 서버가 거절한 구매까지 확정된다.
 * (확인을 3일 안에 아무도 안 하면 구글이 자동 환불한다 — 그래서 서버가 반드시 한다.)
 *
 * 웹과의 약속(`src/features/billing/play-billing-native.ts`):
 *   purchase({ productId }) -> { purchaseToken } | { cancelled: true }
 *   restore()               -> { purchaseToken } | {}
 */
@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin {

    /** 결제창은 사용자가 오래 붙들 수 있어 콜백이 늦게 온다 — 그 사이 call 을 들고 있는다. */
    private PluginCall pendingPurchase;
    private BillingClient client;

    /**
     * 결제 결과는 이 리스너로 온다(결제창을 띄운 메서드의 반환값이 아니다).
     * 그래서 `purchase()` 는 결과를 여기서 돌려준다.
     */
    private final PurchasesUpdatedListener purchasesUpdated = (result, purchases) -> {
        PluginCall call = pendingPurchase;
        pendingPurchase = null;
        if (call == null) return;

        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            // 사용자가 닫은 건 오류가 아니다 — 웹이 빨간 글씨를 띄우지 않게 구분해 준다.
            JSObject out = new JSObject();
            out.put("cancelled", true);
            call.resolve(out);
            return;
        }
        if (code != BillingClient.BillingResponseCode.OK || purchases == null) {
            call.reject("결제에 실패했어요 (" + code + ")");
            return;
        }
        String token = firstUsableToken(purchases);
        if (token == null) {
            // 결제 대기(PENDING) 상태 — 아직 돈이 안 들어왔다. 권한을 주면 안 된다.
            call.reject("결제가 아직 완료되지 않았어요. 완료되면 다시 열어 주세요.");
            return;
        }
        JSObject out = new JSObject();
        out.put("purchaseToken", token);
        call.resolve(out);
    };

    /**
     * 결제가 **끝난** 구매의 토큰만 고른다.
     * PENDING(예: 편의점 결제 대기)은 아직 돈이 안 들어온 상태라 제외한다.
     */
    private String firstUsableToken(List<Purchase> purchases) {
        for (Purchase p : purchases) {
            if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                return p.getPurchaseToken();
            }
        }
        return null;
    }

    /** 필요할 때 붙는다. 이미 붙어 있으면 바로 실행. */
    private void withClient(@NonNull PluginCall call, @NonNull Runnable ready) {
        if (client != null && client.isReady()) {
            ready.run();
            return;
        }
        client = BillingClient.newBuilder(getContext())
            .setListener(purchasesUpdated)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
            )
            .build();
        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    ready.run();
                } else {
                    // 플레이 스토어가 없거나 오래된 기기 — 사용자가 할 수 있는 일이 없다.
                    call.reject("구글 플레이 결제를 사용할 수 없어요 ("
                        + result.getResponseCode() + ")");
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // 다음 호출에서 다시 붙는다(여기서 재시도 루프를 돌리지 않는다).
                client = null;
            }
        });
    }

    /** 구독 결제창을 띄운다. 성공하면 구매 토큰만 돌려준다. */
    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId", "");
        if (productId == null || productId.isEmpty()) {
            call.reject("상품 id 가 없어요.");
            return;
        }
        if (pendingPurchase != null) {
            // 결제창이 이미 떠 있는데 또 띄우면 둘 중 하나는 결과를 못 받는다.
            call.reject("이미 결제가 진행 중이에요.");
            return;
        }
        withClient(call, () -> {
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                ))
                .build();

            client.queryProductDetailsAsync(params, (result, products) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK
                    || products == null || products.isEmpty()) {
                    // 대개 Play Console 의 상품 id 가 다르거나 아직 활성화 전이다.
                    call.reject("상품 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.");
                    return;
                }
                ProductDetails details = products.get(0);
                List<ProductDetails.SubscriptionOfferDetails> offers =
                    details.getSubscriptionOfferDetails();
                if (offers == null || offers.isEmpty()) {
                    call.reject("이 상품의 구독 정보를 찾지 못했어요.");
                    return;
                }
                // 구독은 offerToken 이 반드시 있어야 결제창이 뜬다(일회성 상품과 다르다).
                String offerToken = offers.get(0).getOfferToken();

                BillingFlowParams flow = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(Collections.singletonList(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(details)
                            .setOfferToken(offerToken)
                            .build()
                    ))
                    .build();

                pendingPurchase = call;
                // 결제창은 액티비티 위에 뜬다 — 결과는 purchasesUpdated 로 온다.
                getActivity().runOnUiThread(() -> {
                    BillingResult launched = client.launchBillingFlow(getActivity(), flow);
                    if (launched.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        pendingPurchase = null;
                        call.reject("결제창을 열지 못했어요 ("
                            + launched.getResponseCode() + ")");
                    }
                });
            });
        });
    }

    /**
     * 이미 산 구독을 다시 찾는다(기기 변경·재설치). 결제 기록은 구글에 있는데 우리
     * 서버엔 없을 수 있어서 필요하다.
     */
    @PluginMethod
    public void restore(PluginCall call) {
        withClient(call, () -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();
            client.queryPurchasesAsync(params, (result, purchases) -> {
                JSObject out = new JSObject();
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK
                    || purchases == null) {
                    // 못 찾은 것과 오류를 구분하지 않는다 — 웹은 어느 쪽이든 같은 안내를 한다.
                    call.resolve(out);
                    return;
                }
                String token = firstUsableToken(purchases);
                if (token != null) out.put("purchaseToken", token);
                call.resolve(out);
            });
        });
    }

    /**
     * ⚠ 쓰지 않는다 — **수령 확인은 서버가 한다**(위 주석 참고).
     * 서버가 계속 실패해 3일이 다 되어 갈 때를 대비한 마지막 수단으로만 남겨 둔다.
     */
    @PluginMethod
    public void acknowledgeLocally(PluginCall call) {
        String token = call.getString("purchaseToken", "");
        if (token == null || token.isEmpty()) {
            call.reject("구매 토큰이 없어요.");
            return;
        }
        withClient(call, () -> {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(token)
                .build();
            client.acknowledgePurchase(params, result -> {
                JSObject out = new JSObject();
                out.put("ok", result.getResponseCode() == BillingClient.BillingResponseCode.OK);
                call.resolve(out);
            });
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (client != null) {
            client.endConnection();
            client = null;
        }
        pendingPurchase = null;
        super.handleOnDestroy();
    }
}
