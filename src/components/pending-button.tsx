"use client";

import {
  useTransition,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";

type PendingButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> & {
  /** 비동기 작업. 실행 중엔 자동으로 버튼 비활성 + 스피너 표시(두세 번 클릭 방지). */
  onClick: () => void | Promise<void>;
  children: ReactNode;
  /** 스피너를 아이콘 위치에 표시(기본 true). false면 비활성만. */
  showSpinner?: boolean;
  spinnerSize?: number;
  /** 실행 중 라벨(없으면 children 유지). */
  pendingLabel?: ReactNode;
  /** 외부 pending(부모 useTransition 등)과 합쳐서 비활성 처리. */
  busy?: boolean;
};

/**
 * 재사용 로딩 버튼 — 클릭 즉시 pending 처리해 중복 클릭을 막고 스피너를 보여준다.
 * 느린 서버액션/네비게이션 버튼을 이걸로 감싸면 "두세 번 눌러 더 느려지는" 문제가 사라진다.
 */
export function PendingButton({
  onClick,
  children,
  showSpinner = true,
  spinnerSize = 16,
  pendingLabel,
  busy = false,
  disabled,
  className,
  type = "button",
  ...rest
}: PendingButtonProps) {
  const [pending, start] = useTransition();
  const isBusy = pending || busy;

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || isBusy}
      aria-busy={isBusy || undefined}
      onClick={() => {
        if (isBusy) return;
        start(async () => {
          await onClick();
        });
      }}
      className={className}
    >
      {isBusy && showSpinner ? (
        <Loader2
          aria-hidden="true"
          size={spinnerSize}
          className="animate-spin"
        />
      ) : null}
      {isBusy && pendingLabel ? pendingLabel : children}
    </button>
  );
}
