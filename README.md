# PromptLab

> **Version 1.0.0** | Professional Prompt Engineering Studio

PromptLab is a Professional Prompt Engineering Studio designed to store, manage, and share high-quality prompts.

## Features

- Build structured prompts with role, context, constraints, examples, and output format controls.
- Browse the public prompt library from JSON templates in `prompts/`.
- Use **My Prompts** to keep a local IndexedDB-backed working draft and generated prompt history in the browser.
- Copy or download generated prompts as Markdown.

## Folder Structure

```text
promptlab/
├── css/
│   ├── style.css          # Main stylesheet for the application
│   └── style.min.css      # Minified stylesheet (production build)
├── js/
│   ├── app.js             # Main frontend application logic
│   ├── app.min.js         # Minified app (production build)
│   ├── harperIntegration.js  # Harper.js integration for grammar checking
│   ├── promptGenerator.js    # Prompt generation utilities
│   ├── promptStorage.js      # IndexedDB storage for My Prompts
│   ├── ui.js              # UI component functions
│   └── validators.js      # Validation utilities
├── docs/                  # Contributor and implementation documentation
│   └── MY_PROMPTS_INDEXEDDB.md # Local browser storage implementation notes
├── vendor/                # Third-party dependencies
│   └── fontawesome/       # FontAwesome icon library
├── prompts/               # JSON-based prompt library directory
│   ├── manifest.json      # Manifest index of all available prompts
│   ├── LICENSE            # Specific content license for prompts
│   └── *.json             # Individual prompt definition files (40+ templates)
├── .github/               # GitHub configuration
│   └── ISSUE_TEMPLATE/    # GitHub issue templates
├── .gitignore             # Git ignore configuration
├── index.html             # The main entry point of the application
├── copyright.html         # Copyright policy page
├── privacy.html           # Privacy policy page
├── terms.html             # Terms of service page
├── package.json           # Node.js project metadata and dependencies
├── pnpm-lock.yaml         # Project dependency lockfile (pnpm lock file)
├── pnpm-workspace.yaml    # Workspace configuration for pnpm
├── eslint.config.js       # ESLint configuration for code quality
├── wrangler.jsonc         # Cloudflare Wrangler configuration
├── robots.txt             # Search engine crawler directives
├── sitemap.xml            # XML sitemap for SEO
├── logo.png               # Application logo
└── LICENSE                # Project source code license (Apache 2.0)
```

## Contributing

We welcome contributions! Whether it's adding new high-quality prompts, fixing bugs, or improving the application UI, your help is appreciated.

### How to Contribute

1. **Fork the Repository**: Start by forking the project to your own GitHub account.
2. **Clone the Project**: Clone your fork to your local machine.
3. **Install Dependencies**: Run `pnpm install` or `npm install` to get the necessary web dependencies.
4. **Create a Branch**: Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name`).
5. **Make Changes**:
   - **Adding Prompts**: To add a new prompt, create a `.json` file in the `prompts/` directory following the existing data schema, and update `prompts/manifest.json`.
   - **Code Changes**: Ensure your HTML, CSS, and JS changes are well-structured and commented.
6. **Commit Changes**: Commit your changes with clear, descriptive commit messages.
7. **Push to GitHub**: Push your branch to your forked repository.
8. **Submit a Pull Request**: Open a pull request against the main repository. Please describe your changes clearly in the PR description.

### Running Locally

To run the application locally for testing:

```bash
# If using pnpm (recommended)
pnpm install
pnpm dev

# If using npm
npm install
npm run dev
```

## License

This project is dual-licensed:

- **Source Code**: Licensed under the [Apache License 2.0](./LICENSE).
- **Prompt Content**: The prompts in the library are licensed under the [PromptLab Content License v1.0](./prompts/LICENSE).
