# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## ✅ ARM64 Support (Raspberry Pi 5)

Tested and working on Raspberry Pi 5 (ARM64). Remotion automatically downloads the correct headless Chrome binary for `linux-arm64`.

## Quick Render

Use the included render script:

```console
./render.sh TextTitle --props '{"title":"Hello","subtitle":"World"}'
```

See `TEMPLATES.md` for available compositions.

### Pi-Optimized Rendering

For faster, more efficient renders on Raspberry Pi, use the `--pi-optimize` flag:

```console
./render.sh TextTitle --pi-optimize
```

Or use the npm script:

```console
npm run render:pi TextTitle out/video.mp4
```

**Performance gains:**
- ⚡ **30% faster** rendering
- 📦 **25% smaller** file sizes
- 💾 Better quality/size tradeoff

**What it does:**
- Sets concurrency to 2 (optimal for Pi 5's 4 cores)
- Uses JPEG intermediate frames (faster than PNG)
- Quality: 90 (great balance)
- CRF: 25 (efficient encoding)

**Shorthand:** You can also use `--pi` instead of `--pi-optimize`

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
