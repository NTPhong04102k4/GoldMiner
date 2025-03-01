import { createNavigationContainerRef, ParamListBase } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<ParamListBase>();

let pendingNavigation: { name: keyof ParamListBase; params?: object } | null = null;

export function navigate(name: keyof ParamListBase, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    pendingNavigation = { name, params }; // Lưu trữ điều hướng nếu chưa sẵn sàng
  }
}

// Khi NavigationContainer sẵn sàng, thực hiện điều hướng chờ
export function onNavigationReady() {
  if (pendingNavigation) {
    navigate(pendingNavigation.name, pendingNavigation.params);
    pendingNavigation = null; // Xóa trạng thái sau khi điều hướng
  }
}
