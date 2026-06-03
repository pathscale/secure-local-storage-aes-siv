# Secure Local Storage AES-SIV

[![npm](https://img.shields.io/npm/v/@pathscale/secure-local-storage-aes-siv.svg)](https://www.npmjs.com/package/@pathscale/secure-local-storage-aes-siv) [![downloads](https://img.shields.io/npm/dm/@pathscale/secure-local-storage-aes-siv.svg)](http://npm-stat.com/charts.html?package=@pathscale/secure-local-storage-aes-siv) [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A secure, encrypted local storage library. This fork provides a drop-in replacement for localStorage with AES-256-SIV authenticated encryption and type preservation.

## 🚀 Features

- **🔐 Automatic Encryption**: All data is encrypted using AES-256-SIV (RFC 5297)
- **📝 Type Preservation**: Maintains original data types (string, number, boolean, object)
- **🎯 Framework Agnostic**: Works with React, Vue, Angular, Vite, Next.js, and vanilla JavaScript
- **💾 Memory Caching**: Singleton pattern with in-memory cache for performance
- **🛡️ Authenticated Encryption**: Stored values include an authentication tag (misuse-resistant)
- **⚙️ Configurable**: Extensive configuration options and environment variable support
- **📦 TypeScript Ready**: Full TypeScript support with comprehensive type definitions
- **🚀 Production Ready**: Thoroughly tested and optimized for performance

## 🤔 Why Secure Local Storage?

### The Problem with Regular localStorage

Regular localStorage stores data as plain text, making it vulnerable to:

- **Data theft**: Anyone with device access can read your stored data
- **Tampering**: Stored data can be modified without the app noticing
- **No type safety**: Everything is stored as strings, losing original data types

### The Solution

Secure Local Storage encrypts values before writing them to localStorage. The library uses AES-256-SIV (Synthetic Initialization Vector) authenticated encryption, which is misuse‑resistant – you do not need to manage or store a separate nonce. For now, the package uses a built-in 32-byte development key unless a custom `hashKey` is provided as a raw 32-byte, base64, or hex key. **This default key is only for development – replace it with an auth‑provided key in production.**

## 📦 Installation

```bash
npm install @pathscale/secure-local-storage-aes-siv
```

or

```bash
yarn add @pathscale/secure-local-storage-aes-siv
```

## 🏃‍♂️ Quick Start

### Basic Usage

```typescript
import secureLocalStorage from "@pathscale/secure-local-storage-aes-siv";

// Store different data types
secureLocalStorage.setItem("user", {
  name: "John Doe",
  age: 30,
  active: true,
});

secureLocalStorage.setItem("count", 42);
secureLocalStorage.setItem("enabled", true);
secureLocalStorage.setItem("message", "Hello, World!");

// Retrieve data (maintains original types)
const user = secureLocalStorage.getItem("user"); // Returns object
const count = secureLocalStorage.getItem("count"); // Returns number
const enabled = secureLocalStorage.getItem("enabled"); // Returns boolean
const message = secureLocalStorage.getItem("message"); // Returns string

// Remove items
secureLocalStorage.removeItem("user");

// Clear all secure storage
secureLocalStorage.clear();

// Get all keys
const keys = secureLocalStorage.keys(); // Returns string[]

// Get storage length
const length = secureLocalStorage.length(); // Returns number
```

### Advanced Usage

```typescript
import { SecureLocalStorage } from "@pathscale/secure-local-storage-aes-siv";

// Create a custom instance with configuration
const customStorage = SecureLocalStorage.getInstance({
  hashKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  prefix: "myapp_",
  debug: true,
});

// Use the custom instance
customStorage.setItem("data", { custom: true });
```

## ⚙️ Configuration

### Environment Variables

Secure Local Storage supports multiple frameworks through environment variables:

#### React

```bash
REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY=your-secret-key
REACT_APP_SECURE_LOCAL_STORAGE_PREFIX=myapp_
REACT_APP_SECURE_LOCAL_STORAGE_DISABLED_KEYS=Canvas|Fonts
```

#### Vite

```bash
VITE_SECURE_LOCAL_STORAGE_HASH_KEY=your-secret-key
VITE_SECURE_LOCAL_STORAGE_PREFIX=myapp_
VITE_SECURE_LOCAL_STORAGE_DISABLED_KEYS=Canvas|Fonts
```

#### Next.js

```bash
NEXT_PUBLIC_SECURE_LOCAL_STORAGE_HASH_KEY=your-secret-key
NEXT_PUBLIC_SECURE_LOCAL_STORAGE_PREFIX=myapp_
NEXT_PUBLIC_SECURE_LOCAL_STORAGE_DISABLED_KEYS=Canvas|Fonts
```

#### Generic/Node.js

```bash
SECURE_LOCAL_STORAGE_HASH_KEY=your-secret-key
SECURE_LOCAL_STORAGE_PREFIX=myapp_
SECURE_LOCAL_STORAGE_DISABLED_KEYS=Canvas|Fonts
```

### Vite Configuration

For Vite projects, you need to define `process.env` in your `vite.config.ts`:

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "process.env": {
      SECURE_LOCAL_STORAGE_HASH_KEY: JSON.stringify(
        process.env.VITE_SECURE_LOCAL_STORAGE_HASH_KEY,
      ),
      // Add other environment variables as needed
    },
  },
});
```

### Configuration Options

| Option         | Type                    | Default                              | Description                     |
| -------------- | ----------------------- | ------------------------------------ | ------------------------------- |
| `hashKey`      | `string`                | `'secure-local-storage-default-key'` | Custom encryption key           |
| `prefix`       | `string`                | `'sls_'`                             | Storage key prefix              |
| `disabledKeys` | `FingerprintProperty[]` | `[]`                                 | Disabled fingerprint properties |
| `debug`        | `boolean`               | `false`                              | Enable debug logging            |

### Fingerprint Properties

You can disable specific browser fingerprint properties:

| Property         | Description                       |
| ---------------- | --------------------------------- |
| `UserAgent`      | Browser user agent string         |
| `ScreenPrint`    | Screen dimensions and color depth |
| `Plugins`        | Installed browser plugins         |
| `Fonts`          | Available system fonts            |
| `LocalStorage`   | localStorage availability         |
| `SessionStorage` | sessionStorage availability       |
| `TimeZone`       | System timezone                   |
| `Language`       | Browser language                  |
| `SystemLanguage` | System language                   |
| `Cookie`         | Cookie support                    |
| `Canvas`         | Canvas fingerprint                |
| `Hostname`       | Current hostname                  |

> **Note**: Disabling properties reduces the uniqueness of the browser fingerprint, potentially making encryption less secure.

## 🔧 API Reference

### Methods

#### `setItem(key: string, value: StorageValue): void`

Stores a value in secure local storage.

```typescript
secureLocalStorage.setItem("user", { name: "John", age: 30 });
```

#### `getItem(key: string): StorageValue`

Retrieves a value from secure local storage. Returns `null` if the key doesn't exist.

```typescript
const user = secureLocalStorage.getItem("user");
```

#### `removeItem(key: string): void`

Removes a specific item from secure local storage.

```typescript
secureLocalStorage.removeItem("user");
```

#### `clear(): void`

Removes all items from secure local storage.

```typescript
secureLocalStorage.clear();
```

#### `keys(): string[]`

Returns an array of all keys in secure local storage.

```typescript
const allKeys = secureLocalStorage.keys();
```

#### `length(): number`

Returns the number of items in secure local storage.

```typescript
const itemCount = secureLocalStorage.length();
```

### Types

```typescript
type StorageValue = string | number | boolean | object | null;

interface SecureStorageConfig {
  hashKey?: string;
  prefix?: string;
  disabledKeys?: FingerprintProperty[];
  debug?: boolean;
}

type FingerprintProperty =
  | "UserAgent"
  | "ScreenPrint"
  | "Plugins"
  | "Fonts"
  | "LocalStorage"
  | "SessionStorage"
  | "TimeZone"
  | "Language"
  | "SystemLanguage"
  | "Cookie"
  | "Canvas"
  | "Hostname";
```

## 🔒 Security Features

### Encryption Details

- **Algorithm**: AES-256-SIV (RFC 5297) – Synthetic Initialization Vector authenticated encryption
- **Implementation**: `@noble/ciphers/aes`
- **Key size**: 32 bytes (256 bits)
- **Authentication**: Built‑in 16‑byte tag, verified on decryption
- **Misuse resistance**: No separate nonce required; encryption is deterministic and secure even if the same plaintext is encrypted twice with the same key
- **Temporary fallback**: Built-in development key until auth provides a login-bound key

### Data Protection

- Each encrypted item includes metadata (type, timestamp, version)
- Type information is preserved and restored
- Memory cache prevents repeated decryption operations
- Automatic validation of encrypted data integrity

## 📚 Examples

### React Example

```tsx
import React, { useState, useEffect } from "react";
import secureLocalStorage from "@pathscale/secure-local-storage-aes-siv";

const UserProfile: React.FC = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Load user from secure storage
    const savedUser = secureLocalStorage.getItem("user");
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const saveUser = (userData: any) => {
    secureLocalStorage.setItem("user", userData);
    setUser(userData);
  };

  const logout = () => {
    secureLocalStorage.removeItem("user");
    setUser(null);
  };

  return (
    <div>
      {user ? (
        <div>
          <h1>Welcome, {user.name}!</h1>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={() => saveUser({ name: "John", id: 1 })}>Login</button>
      )}
    </div>
  );
};
```

### Vue Example

```vue
<template>
  <div>
    <h1 v-if="user">Welcome, {{ user.name }}!</h1>
    <button @click="toggleUser">
      {{ user ? "Logout" : "Login" }}
    </button>
  </div>
</template>

<script>
import secureLocalStorage from "@pathscale/secure-local-storage-aes-siv";

export default {
  data() {
    return {
      user: null,
    };
  },

  mounted() {
    this.user = secureLocalStorage.getItem("user");
  },

  methods: {
    toggleUser() {
      if (this.user) {
        secureLocalStorage.removeItem("user");
        this.user = null;
      } else {
        const userData = { name: "John", id: 1 };
        secureLocalStorage.setItem("user", userData);
        this.user = userData;
      }
    },
  },
};
</script>
```

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run linting: `npm run lint`
5. Test locally in a browser with the built files

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you have any questions or issues, please:

1. Check the [documentation](#-api-reference)
2. Search existing issues in the fork repository
3. Create a new issue if needed

## 🔗 Related Projects

- [@noble/ciphers](https://github.com/paulmillr/noble-ciphers) – Modern cryptographic library used for AES-SIV

---

Forked from `@jahidulsaeid/secure-local-storage` and ported to AES-256-SIV.
