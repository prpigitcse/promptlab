# PromptLab

PromptLab is a Professional Prompt Engineering Studio designed to store, manage, and share high-quality prompts.

## Folder Structure

```text
promptlab/
├── css/
│   └── style.css          # Main stylesheet for the application
├── js/
│   └── app.js             # Main frontend application logic 
├── node_modules/          # Project dependencies (git-ignored)
├── prompts/               # JSON-based prompt library directory
│   ├── manifest.json      # Manifest index of all available prompts
│   ├── LICENSE            # Specific content license for prompts
│   └── *.json             # Individual prompt definition files
├── .gitignore             # Git ignore configuration
├── index.html             # The main entry point of the application
├── copyright.html         # Copyright policy page
├── privacy.html           # Privacy policy page
├── terms.html             # Terms of service page
├── package.json           # Node.js project metadata and dependencies
├── pnpm-lock.yaml         # Project dependency lockfile
├── logo.png               # High-res application logo
├── logo.jpg               # Application logo
└── LICENSE                # Project source code license
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
