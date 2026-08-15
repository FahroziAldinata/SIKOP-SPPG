# Quick Start Guide for AGENT-PM Template

## 🎯 Goal
Configure .agent-pm directory as a generic template that can be used by any project/user.

## 📋 Prerequisites
- Git installed
- AGY (Antigravity) installed and accessible
- Text editor (VS Code, etc.)

## 🚀 3-Step Setup

### Step 1: Copy Template Configuration
```bash
# Copy the template config
cp .agent-pm/config.template.json .agent-pm/config.json
```

### Step 2: Edit Configuration
Edit `.agent-pm/config.json` with your values:

```json
{
  "project": {
    "name": "Your Project Name",
    "description": "Your project description",
    "root_path": "C:\\path\\to\\your\\project"
  },
  "user": {
    "name": "Your Name",
    "email": "your.email@example.com",
    "role": "Project Manager"
  },
  "agent": {
    "agy": {
      "path_laptop": "D:\\Tools_Project\\agy\\bin\\agy.exe",
      "path_pc": "E:\\Folder_Project\\Antigravity\\bin\\agy.exe",
      "timeout": 120,
      "model_primary": "claude-sonnet-4-6",
      "model_backup": "gemini-flash-3.6-medium"
    }
  }
}
```

### Step 3: Run Setup Script
```bash
# PowerShell (Windows)
.\setup-agent-pm.ps1 -ProjectName "Your Project" -ProjectRoot "C:\\path\\to\\project" -UserName "Your Name"

# Bash (Linux/macOS/WSL)
chmod +x setup-agent-pm.sh
./setup-agent-pm.sh
```

## ✅ Verification

Check that setup worked:
```bash
# Check for remaining placeholders
grep -r "\[.*\]" .agent-pm/ | head -5 || echo "✅ No placeholders found"

# Check key files
echo "Key files configured:"
echo "✅ SOUL.md - Core identity"
echo "✅ PROJECT_MANAGER_BEHAVIOR.md - Behavior rules"
echo "✅ AUTOMATION_CYCLE.md - Workflow states"
echo "✅ README.md - User guide"
```

## 🎉 Result

Your .agent-pm directory is now a generic template ready for:

1. **New Projects** - Configure once, use many times
2. **Different Users** - Easy onboarding
3. **Multiple Teams** - Consistent workflows
4. **Educational Use** - Learn project management

## 🔄 Next Steps

1. **Test the workflow** with a simple task
2. **Customize rules** for your specific needs
3. **Share with team** members
4. **Create project-specific** variations

## 🔧 Troubleshooting

**Common Issues:**
- **Path errors**: Ensure AGY paths are correct
- **Permission denied**: Run scripts as administrator
- **Placeholders remain**: Check config.json values
- **Git issues**: Ensure git is in PATH

**Get Help:**
- Read `README.md` in .agent-pm/
- Check `backup/` folder for original files
- Review `SOUL.md` for workflow details