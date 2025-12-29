# YuHeng (玉衡)

YuHeng (玉衡 Jade Balance) is a local-first nutrition tracking application powered by AI. It helps you track your nutrition effectively through photo-based logging, automatic dish recognition, and smart portion management.

## 🚀 Key Features

- **Photo-based food logging**: Snapshot your meal and let AI handle the rest.
- **Smart Recognition**: Powered by Gemini, OpenAI, and other LLMs.
- **Async Processing**: Fast, non-blocking background analysis.
- **Privacy First**: Local database support (SQLite) with optional PostgreSQL for scaling.
- **Portion Splitting**: Easily log shared meals by percentage or person count.

## 📖 Documentation

For detailed guides, architecture, and system design, please visit our documentation site:

👉 **[https://formaxcn.github.io/yuheng/](https://formaxcn.github.io/yuheng/)**

---

## Quick Start

1. Clone the repo: `git clone https://github.com/formaxcn/yuheng.git`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Access at `http://localhost:3000` and configure your API keys in the settings.

## Docker

```bash
docker run -d \
  --name yuheng \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  ghcr.io/formaxcn/yuheng
```

For more deployment options (including Docker Compose with PostgreSQL), see the **[Full Documentation](https://formaxcn.github.io/yuheng/)**.
