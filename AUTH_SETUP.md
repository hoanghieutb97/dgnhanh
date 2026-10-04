# Authentication Setup - Simplified

## Quy trình

### 1. **Khởi động app**
- AuthContext checks localStorage cho token
- Nếu không có → Fetch token từ API
- Token được lưu vào localStorage

### 2. **Sử dụng token**
```javascript
import { useFetch } from "@/app/hooks/useFetch";

const { fetchWithAuth } = useFetch();
const data = await fetchWithAuth("https://api.example.com/data");
```

### 3. **Tự động refresh token**
- Nếu API trả về **401 (Unauthorized)**
- `useFetch` tự động gọi `refreshToken()`
- Token mới được fetch và retry request
- Không cần bạn xử lý!

## Files

| File | Mục đích |
|------|---------|
| `app/lib/auth.js` | `login()`, `refreshToken()`, `getToken()` |
| `app/context/AuthContext.jsx` | Cung cấp token cho app |
| `app/hooks/useFetch.js` | Fetch với token + auto-refresh |
| `constants/index.js` | API endpoints & credentials |

## Ví dụ sử dụng

```javascript
"use client";

import { useFetch } from "@/app/hooks/useFetch";

export default function MyComponent() {
  const { fetchWithAuth, isLoading, error } = useFetch();

  const handleClick = async () => {
    try {
      const data = await fetchWithAuth(
        "https://api.example.com/orders"
      );
      console.log(data);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  };

  return <button onClick={handleClick}>Fetch Data</button>;
}
```

## Token Lifecycle

1. **Startup**: Load token từ localStorage (hoặc fetch nếu không có)
2. **Usage**: Gắn token vào request header
3. **401 Response**: Tự động refresh token
4. **Retry**: Fetch lại với token mới
5. **Done**: Trả về data hoặc error
