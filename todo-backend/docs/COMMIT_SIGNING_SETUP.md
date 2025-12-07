# Setting Up Verified Commit Signing for GitHub

GitHub requires verified signatures on commits. You have two options:

## Option 1: SSH Signing (Recommended - Easier on Windows)

Since you already have SSH installed, this is the simpler option.

### Step 1: Generate an SSH Key for Signing (if you don't have one)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519_signing
```

When prompted, you can set a passphrase or leave it empty.

### Step 2: Start the SSH Agent

```bash
# Start the agent
Start-Service ssh-agent

# Add your key
ssh-add ~/.ssh/id_ed25519_signing
```

### Step 3: Get Your Public Key

```bash
cat ~/.ssh/id_ed25519_signing.pub
```

Copy the entire output.

### Step 4: Add SSH Key to GitHub

1. Go to GitHub.com → Settings → SSH and GPG keys
2. Click "New SSH key"
3. Title: "Signing Key" (or any name)
4. Key type: "Signing Key"
5. Paste your public key
6. Click "Add SSH key"

### Step 5: Configure Git to Use SSH Signing

```bash
# Set the signing key
git config --global user.signingkey ~/.ssh/id_ed25519_signing.pub

# Use SSH format
git config --global gpg.format ssh

# Enable signing for all commits
git config --global commit.gpgsign true
```

### Step 6: Test It

```bash
git commit -m "Test signed commit"
```

---

## Option 2: GPG Signing (Traditional Method)

If you prefer GPG signing, follow these steps:

### Step 1: Install Gpg4win

1. Download from: https://www.gpg4win.org/download.html
2. Install and restart your terminal

### Step 2: Generate GPG Key

```bash
gpg --full-generate-key
```

Choose:
- Key type: `1` (RSA and RSA)
- Key size: `4096`
- Expiration: `1y` (or `0` for no expiration)
- Enter your name and GitHub email
- Set a passphrase

### Step 3: Get Your Key ID

```bash
gpg --list-secret-keys --keyid-format=long
```

Look for the key ID after `rsa4096/` (e.g., `ABC123DEF4567890`)

### Step 4: Configure Git

```bash
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

### Step 5: Export and Add to GitHub

```bash
gpg --armor --export YOUR_KEY_ID
```

Copy the output and add it to GitHub:
1. GitHub.com → Settings → SSH and GPG keys
2. Click "New GPG key"
3. Paste and save

---

## Verify Your Setup

After setting up either method, verify with:

```bash
git log --show-signature
```

Your commits will show as "Verified" on GitHub!


