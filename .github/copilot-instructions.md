# Copilot Instructions for Security Detection Game

## Overview
This project is a Security Detection Game designed to help users identify vulnerabilities in code snippets. The architecture consists of a frontend built with React and TypeScript, and a backend powered by FastAPI. The communication between the frontend and backend is facilitated through RESTful APIs.

## Architecture
- **Frontend**: Located in the `client` directory, it utilizes Vite for development and includes components for various game screens and functionalities.
- **Backend**: Found in the `server` directory, it handles API requests, processes game logic, and integrates with external services like the Anthropic API for code generation.

### Key Components
- **Frontend Components**: Each component in `client/src/components` serves a specific part of the game interface, such as `GameScreen`, `HomePage`, and `TaskTracker`.
- **Backend Services**: The backend services in `server/app` manage the game logic and API endpoints, with integrations for external APIs located in `server/app/integrations`.

## Developer Workflows
### Running the Project
1. **Frontend**: Navigate to the `client` directory and run:
   ```bash
   npm install
   npm run dev
   ```
2. **Backend**: In the `server` directory, execute:
   ```bash
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

### Testing
- Use the provided API documentation at `http://localhost:8000/docs` to test endpoints interactively.
- Ensure to run tests after making changes to the codebase.

## Project Conventions
- **Environment Variables**: Store sensitive information in a `.env` file, which should be included in `.gitignore` to prevent exposure in version control.
- **Error Handling**: Implement consistent error handling across the backend to sanitize error messages and avoid exposing internal details.

## Integration Points
- **Anthropic API**: The backend integrates with the Anthropic API for generating code snippets. Ensure the `ANTHROPIC_API_KEY` is set in your environment variables.
- **CORS Configuration**: The backend restricts CORS to specified origins, which should be configured in the `.env` file.

## External Dependencies
- **Frontend**: Uses Vite, React, and TypeScript with ESLint for code quality.
- **Backend**: Relies on FastAPI, Pydantic for data validation, and various libraries listed in `requirements.txt`.

## Communication Patterns
- The frontend communicates with the backend via RESTful API calls, primarily using `fetch` or `axios` for making requests.
- Ensure to handle responses and errors appropriately in the frontend components.

## Conclusion
This document serves as a guide for AI coding agents to navigate and contribute effectively to the Security Detection Game codebase. For further details, refer to the README files in both the `client` and `server` directories.