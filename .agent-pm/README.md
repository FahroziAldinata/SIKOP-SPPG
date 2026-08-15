# AGENT-PM - Generic Template

> A generic template for AI Administrative Project Manager setup
> Originally created for SPPG project, now configurable for any project

## 🚀 Quick Start

### 1. Configure Your Project

Copy `SETUP_CONFIG.md` and edit the placeholder values:

```bash
# Edit the configuration file
nano SETUP_CONFIG.md

# Required fields:
- [PROJECT_NAME] = Your Project Name
- [PROJECT_ROOT] = Full path to project root
- [USER_NAME] = Your name/username
- [AGY_PATH_LAPTOP] = Path to AGY executable
- [AGY_PATH_PC] = Path to AGY executable (if different)
```

### 2. Run Setup Script

```bash
# Make script executable (Linux/macOS)
chmod +x setup-agent-pm.sh

# Run setup
./setup-agent-pm.sh
```

### 3. Verify Configuration

Check that all placeholders have been replaced in the files:

```bash
# Check for remaining placeholders
grep -r "\[.*\]" .agent-pm/ || echo "✅ No placeholders found"
```

## 📁 Structure Overview

```
.agent-pm/
├── governance/           # Core governance and rules
│   ├── SOUL.md          # Core identity and workflow rules
│   ├── PROJECT_MANAGER_BEHAVIOR.md
│   └── AUTOMATION_CYCLE.md
├── knowledge/           # Knowledge base (read-only)
├── working/             # Working state files
├── documentation/       # Consolidated documentation
├── plans/               # Temporary planning files
├── prompts/             # Prompt templates
├── skills/              # Agent skills
├── pre-check/           # Validation scripts
├── validation/          # Validation tools
└── setup-agent-pm.sh    # Setup script
```

## 🔧 Configuration Placeholders

All files use these placeholders that get replaced during setup:

### Project Information
- `[PROJECT_NAME]` - Your project name
- `[PROJECT_DESCRIPTION]` - Project description
- `[PROJECT_ROOT]` - Project root path

### User Information
- `[USER_NAME]` - Your name/username
- `[USER_EMAIL]` - Your email address
- `[USER_ROLE]` - Your role

### Agent Configuration
- `[AGY_PATH_LAPTOP]` - AGY executable path on laptop
- `[AGY_PATH_PC]` - AGY executable path on PC
- `[AGY_TIMEOUT]` - AGY timeout in seconds
- `[AGY_MODEL_PRIMARY]` - Primary AGY model
- `[AGY_MODEL_BACKUP]` - Backup AGY model

### Development Environment
- `[NODE_VERSION]` - Node.js version
- `[NPM_VERSION]` - npm version
- `[DEFAULT_BUILDER]` - Default code builder
- `[COMMIT_TOOL]` - Commit tool

## 🎯 Usage Workflow

1. **Start Session**: Load `SOUL.md` to understand current state
2. **Task Selection**: Choose task from `working/TODO.md`
3. **Execute Cycle**: Follow AUTOMATION_CYCLE.md states
4. **Document Results**: Update `working/` files
5. **Archive**: Move completed tasks to `documentation/DOCUMENTATION.md`

## 🔄 Migration from Specific Projects

If migrating from a specific project (like SPPG):

1. **Backup**: Keep original files for reference
2. **Clean**: Remove project-specific references
3. **Configure**: Run setup script with your project details
4. **Customize**: Adjust rules for your workflow

## 📝 Customization Tips

### For Different Project Types
- **Web Projects**: Adjust tech stack references
- **Mobile Projects**: Modify platform-specific paths
- **Data Projects**: Add data validation rules
- **DevOps Projects**: Include infrastructure automation

### For Different Team Sizes
- **Solo Developer**: Simplify approval matrices
- **Small Teams**: Add team-specific roles
- **Large Teams**: Include escalation procedures

## ⚠️ Important Notes

- **Never commit** `working/` files directly
- **Always backup** before major changes
- **Test workflow** with simple tasks first
- **Keep governance** files updated as rules evolve

## 🤝 Contributing

To contribute improvements to this template:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This template is provided as-is for educational and development purposes.

---

**Made with ❤️ by Hermes AI Administrative Project Manager**