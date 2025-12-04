# Welcome to AdmitAI Nexus

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in GitHub.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Configure environment variables.
cp .env.example .env
# Edit .env and fill in your API keys

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Deployment

This project is configured to automatically deploy to GitHub Pages when you push to the `main` or `master` branch.

**Important:** You must configure your API keys in GitHub Secrets for the deployment to work.

1.  Go to your GitHub Repository.
2.  Navigate to **Settings** > **Secrets and variables** > **Actions**.
3.  Click **New repository secret**.
4.  Add the following secrets (copy values from your local `.env`):
    *   `VITE_GROQ_API_KEY`
    *   `VITE_TAVILY_API_KEY`
    *   `VITE_LANGCHAIN_TRACING_V2`
    *   `VITE_LANGCHAIN_API_KEY`
    *   `VITE_LANGCHAIN_PROJECT`
    *   `VITE_LANGCHAIN_ENDPOINT`
    *   `VITE_SUPABASE_URL`
    *   `VITE_SUPABASE_ANON_KEY`

Once these are set, any push to `main` will trigger a build and deploy.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

<!-- Triggering rebuild for API keys -->
