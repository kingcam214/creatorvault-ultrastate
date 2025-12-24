# 🦁 CreatorVault Brand Assets

**OFFICIAL LOGO - NEVER ASK AGAIN**

---

## Logo Files

### In This Repo
- `assets/logo-white.png` - White text version (for dark backgrounds)
- `assets/logo-black.png` - Black text version (for light backgrounds)
- `client/public/logo-white.png` - Deployed with app (accessible at `/logo-white.png`)
- `client/public/logo-black.png` - Deployed with app (accessible at `/logo-black.png`)

### Logo Specs
- **White version:** 286KB, transparent background, white text
- **Black version:** 95KB, transparent background, black text
- **Format:** PNG with transparency
- **Resolution:** 3x (high-res for retina displays)

---

## Usage in Code

### React Components
```tsx
// Dark background (use white logo)
<img src="/logo-white.png" alt="CreatorVault" className="h-12" />

// Light background (use black logo)
<img src="/logo-black.png" alt="CreatorVault" className="h-12" />
```

### Header/Navigation
```tsx
import { Link } from "wouter";

<Link href="/">
  <img src="/logo-white.png" alt="CreatorVault" className="h-10" />
</Link>
```

### Favicon (if needed)
Convert logo to favicon:
```bash
# Install imagemagick if not installed
sudo apt-get install imagemagick

# Convert to favicon
convert assets/logo-black.png -resize 32x32 client/public/favicon.ico
```

---

## Brand Colors

From logo analysis:
- **Cyan/Blue:** `#00B4D8` (left side gradient start)
- **Purple:** `#8B5CF6` (center gradient)
- **Pink/Magenta:** `#EC4899` (right side gradient)
- **Orange:** `#FF6B35` (dollar sign and nodes)

### Tailwind Config
```js
colors: {
  brand: {
    cyan: '#00B4D8',
    purple: '#8B5CF6',
    pink: '#EC4899',
    orange: '#FF6B35',
  }
}
```

---

## Logo Placement

### Where Logo Appears
- ✅ App header (top-left, all pages)
- ✅ Login page
- ✅ Landing pages (/join-vaultlive, /onboard/influencer)
- ✅ Email templates (if implemented)
- ✅ Social media sharing (og:image)
- ✅ Documentation (README.md, guides)

### Where Logo Should NOT Be
- ❌ Watermarked on user-generated content
- ❌ Favicon (use simplified icon version instead)
- ❌ Tiny sizes under 100px width (text becomes unreadable)

---

## Social Media Assets

### Open Graph (og:image)
Use logo-white.png on dark gradient background:
```html
<meta property="og:image" content="https://your-domain.com/logo-white.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

### Twitter Card
Same as Open Graph

---

## File Locations (Permanent)

**GitHub Repo:**
- https://github.com/kingcam214/cv-ultrastate/blob/main/assets/logo-white.png
- https://github.com/kingcam214/cv-ultrastate/blob/main/assets/logo-black.png

**Deployed App:**
- https://your-railway-url.com/logo-white.png
- https://your-railway-url.com/logo-black.png

**Local Dev:**
- /home/ubuntu/creatorvault-platform/assets/logo-white.png
- /home/ubuntu/creatorvault-platform/assets/logo-black.png
- /home/ubuntu/creatorvault-platform/client/public/logo-white.png
- /home/ubuntu/creatorvault-platform/client/public/logo-black.png

---

## Logo History

**Created:** August 2024 (or earlier)  
**Designer:** KingCam  
**Resent:** 1000+ times (NEVER AGAIN)  
**Permanently Saved:** December 23, 2024  

---

## 🦁 KINGCAM DECREE

**This logo is now part of the codebase.**  
**It deploys with every commit.**  
**It lives in GitHub forever.**  
**NEVER. ASK. AGAIN.**

---

**END OF BRAND ASSETS DOCUMENTATION**
