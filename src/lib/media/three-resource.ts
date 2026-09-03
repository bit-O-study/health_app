import type { Material, Object3D, Texture } from "three";

const resourceUsers = new Map<string, number>();

/** 공유 GLTF 사용자를 등록하고, 반환 함수 호출 시 마지막 사용자인지 알려준다. */
export function retainThreeResource(key: string): () => boolean {
  resourceUsers.set(key, (resourceUsers.get(key) ?? 0) + 1);
  let released = false;

  return () => {
    if (released) return false;
    released = true;
    const remaining = Math.max(0, (resourceUsers.get(key) ?? 1) - 1);
    if (remaining > 0) {
      resourceUsers.set(key, remaining);
      return false;
    }
    resourceUsers.delete(key);
    return true;
  };
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    const texture = value as Texture | undefined;
    if (texture?.isTexture) texture.dispose();
  }
  material.dispose();
}

/** R3F가 자동 관리하지 않는 primitive GLTF의 GPU 자원을 해제한다. */
export function disposeThreeObject(root: Object3D): void {
  root.traverse((object) => {
    const mesh = object as Object3D & {
      geometry?: { dispose(): void };
      material?: Material | Material[];
    };
    mesh.geometry?.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(disposeMaterial);
    } else if (mesh.material) {
      disposeMaterial(mesh.material);
    }
  });
}
