---
type: research
tags: [research, react-native, new-architecture, fabric, turbomodules, expo, mobile]
---
# Research: React Native New Architecture (Fabric + TurboModules)

## Summary

The React Native New Architecture is a ground-up rewrite of RN internals (2018-2024) that enables synchronous rendering, concurrent React features, and 15-40% faster component rendering. **SDK 55+ runs entirely on New Architecture — it cannot be disabled.** For Komod AI on Expo, this is now the only path forward.

## Key Findings

### What Changed
- **Bridge → JSI**: Async serialized bridge replaced with JavaScript Interface (JSI) — direct memory references, zero serialization
- **Fabric Renderer**: New C++ renderer supports multiple threads, immutable tree structure, interrupt-able rendering
- **TurboModules**: Lazy-loaded native modules with synchronous calls and type-safety via Codegen
- **Event Loop**: Well-defined model aligned with HTML spec — enables `microtasks`, `MutationObserver`, `IntersectionObserver`

### Performance Benchmarks (Official Meta Tests)
| Scenario | Old Arch | New Arch | Improvement |
|----------|----------|----------|-------------|
| 5000 Views (iOS) | 435ms | 266ms | **39% faster** |
| 5000 Text (iOS) | 1009ms | 808ms | **20% faster** |
| 5000 Images (iOS) | 673ms | 451ms | **33% faster** |
| 5000 Views (Android) | 1088ms | 1045ms | 4% faster |
| 5000 Text (Android) | 2156ms | 2089ms | 3% faster |

**iOS sees bigger gains** because View Flattening (previously Android-only) now works cross-platform.

### React 18 Features Now Work
- **Suspense** for data fetching with fallback UI
- **Transitions** (`startTransition`) for interruptible updates
- **Automatic batching** — fewer re-renders
- **`useLayoutEffect`** — synchronous layout reads without visual jumps

### Expo SDK Timeline
| SDK | New Arch Status |
|-----|-----------------|
| 52 | Default enabled, can disable |
| 53-54 | Default enabled, can disable |
| **55+** | **Always enabled, cannot disable** |

As of Jan 2026, **83% of SDK 54 EAS builds** use New Architecture.

### What This Unlocks
1. **Synchronous layout** — Tooltips, popovers position without flicker
2. **Concurrent rendering** — UI stays responsive during heavy updates
3. **Real-time frame processing** — VisionCamera processes ~2GB/sec without bridge overhead
4. **Cross-platform C++ renderer** — Same behavior on iOS, Android, Windows, macOS

### Library Compatibility
- All `expo-*` packages support New Arch (SDK 53+)
- Expo Modules API automatically compatible
- Check compatibility: `npx expo-doctor@latest`
- Track status: [reactnative.directory](https://reactnative.directory)

## Practical Applications for Komod AI

### Immediate Benefits
1. **Animation performance** — Reanimated 4 works directly with Fabric renderer
2. **Responsive wardrobe grid** — Concurrent rendering keeps scrolling smooth during heavy item renders
3. **Instant feedback** — Synchronous layout for quick-action menus

### Code Patterns to Adopt
```typescript
// Before: Layout jumps visible
const onLayout = (event) => {
  targetRef.current?.measureInWindow((x, y, w, h) => {
    setPosition({x, y, w, h}); // May render intermediate state
  });
};

// After: No visual jumps with New Arch
useLayoutEffect(() => {
  targetRef.current?.measureInWindow((x, y, w, h) => {
    setPosition({x, y, w, h}); // Synchronous, single commit
  });
}, []);
```

```typescript
// Interruptible heavy renders
const [isPending, startTransition] = useTransition();

const handleFilterChange = (filter) => {
  startTransition(() => {
    setFilter(filter); // Can be interrupted by user input
  });
};

return isPending ? <Skeleton /> : <WardrobeGrid items={filtered} />;
```

### TurboModules for Future Native Features
If Komod AI needs native integrations (camera for outfit photos, ML classification):
```typescript
// specs/NativeOutfitClassifier.ts
import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  classifyImage(uri: string): Promise<string[]>;  // Returns clothing categories
  getColorPalette(uri: string): string[];         // Synchronous color extraction
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeOutfitClassifier');
```

## Resources

### Official Documentation
- [New Architecture Overview](https://reactnative.dev/architecture/landing-page)
- [Expo New Architecture Guide](https://docs.expo.dev/guides/new-architecture/)
- [TurboModules Introduction](https://reactnative.dev/docs/turbo-native-modules-introduction)
- [Fabric Components Guide](https://reactnative.dev/docs/fabric-native-components-introduction)

### Performance & Benchmarks
- [Official Benchmark Discussion](https://github.com/reactwg/react-native-new-architecture/discussions/123)
- [Benchmark App Source](https://github.com/react-native-community/RNNewArchitectureApp/tree/new-architecture-benchmarks)

### Community
- [New Architecture Working Group](https://github.com/reactwg/react-native-new-architecture)
- [Meta Blog: "New Architecture is Here"](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here)

### Success Stories
- Expensify — Migrated to New Arch successfully
- Kraken — Fixed performance issues via incremental adoption
- Bluesky — Shipping with New Architecture

## Next Steps

1. **Verify current status**: Run `npx expo-doctor@latest` in Komod AI to check library compatibility
2. **Update Expo SDK**: Consider upgrading to SDK 55 when ready (New Arch mandatory anyway)
3. **Adopt patterns**: Use `useLayoutEffect` for measurements, `startTransition` for filter/search
4. **Monitor Reanimated 4**: When released, leverage direct Fabric integration for smoother animations
5. **Consider TurboModules**: If adding native ML/camera features, write them as TurboModules for best performance

---

*This is the future of React Native. Komod AI is already positioned correctly with Expo — no migration needed, just awareness of new patterns to leverage.*
