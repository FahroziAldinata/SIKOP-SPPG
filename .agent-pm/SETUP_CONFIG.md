# AGENT-PM SETUP CONFIGURATION

Configuration file for setting up .agent-pm as a generic template.
Replace all [PLACEHOLDER] values with your actual project information.

## Project Information
[PROJECT_NAME] = Your Project Name
[PROJECT_DESCRIPTION] = Brief description of your project
[PROJECT_ROOT] = Full path to your project root directory
[USER_NAME] = Your name/username
[USER_EMAIL] = Your email address
[USER_ROLE] = Your role (e.g., Project Manager, Developer, etc.)

## Agent Configuration
[AGY_PATH_LAPTOP] = Path to AGY executable on laptop
[AGY_PATH_PC] = Path to AGY executable on PC
[AGY_TIMEOUT] = AGY timeout in seconds
[AGY_MODEL_PRIMARY] = Primary AGY model
[AGY_MODEL_BACKUP] = Backup AGY model

## Development Environment
[NODE_VERSION] = Node.js version
[NPM_VERSION] = npm version
[DEFAULT_BUILDER] = Default code builder (OpenCode/AGY)
[COMMIT_TOOL] = Commit tool (OpenCode)

## File Templates
All files in .agent-pm/ use these placeholders:
- [PROJECT_NAME]
- [PROJECT_DESCRIPTION] 
- [PROJECT_ROOT]
- [USER_NAME]
- [USER_EMAIL]
- [USER_ROLE]
- [AGY_PATH_LAPTOP]
- [AGY_PATH_PC]
- [AGY_TIMEOUT]
- [AGY_MODEL_PRIMARY]
- [AGY_MODEL_BACKUP]
- [NODE_VERSION]
- [NPM_VERSION]
- [DEFAULT_BUILDER]
- [COMMIT_TOOL]

## Setup Instructions
1. Replace all [PLACEHOLDER] values in this file
2. Run setup script: `./setup-agent-pm.sh`
3. Verify all files are properly configured
4. Test the workflow with a simple task