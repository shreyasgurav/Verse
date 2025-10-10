# Arc Browser - Troubleshooting Guide

## Issue: Blank White Screen / Web Content Not Showing

### Root Cause
The app was missing the required network entitlements in the Xcode project configuration.

### Solution Applied
✅ **FIXED** - Added proper entitlements configuration to Xcode project.

The following changes were made:

1. **Created `Arc/Arc.entitlements`** with required permissions:
   - `com.apple.security.app-sandbox` - Enable app sandboxing
   - `com.apple.security.network.client` - **CRITICAL** - Allows outgoing network connections
   - `com.apple.security.network.server` - Allows incoming connections
   - `com.apple.security.files.user-selected.read-write` - File access
   - `com.apple.security.files.downloads.read-write` - Download support

2. **Updated `Arc.xcodeproj/project.pbxproj`** to reference the entitlements:
   ```
   CODE_SIGN_ENTITLEMENTS = Arc/Arc.entitlements;
   INFOPLIST_FILE = Arc/Info.plist;
   ```

3. **Configured `Arc/Info.plist`** with network security settings:
   ```xml
   <key>NSAppTransportSecurity</key>
   <dict>
       <key>NSAllowsArbitraryLoads</key>
       <true/>
   </dict>
   ```

### Verification
To verify entitlements are properly applied:

```bash
codesign -d --entitlements - /path/to/Arc.app 2>&1 | grep network
```

Should show:
- `com.apple.security.network.client`
- `com.apple.security.network.server`

## Common Issues

### 1. Web Pages Not Loading

**Symptoms:**
- Blank white screen
- Address bar updates but no content
- No error messages

**Solution:**
- Ensure entitlements file is properly configured
- Rebuild the app: `xcodebuild clean build`
- Verify network entitlements with `codesign` command above

### 2. Build Errors

**Symptoms:**
- Missing Combine framework errors
- SwiftUI compilation errors

**Solution:**
- Ensure all imports are present:
  ```swift
  import SwiftUI
  import WebKit
  import Combine
  ```

### 3. Navigation Not Working

**Symptoms:**
- Can't go back/forward
- Buttons disabled

**Solution:**
- This is normal when there's no history
- Navigate to a few pages to build history
- Check console logs for navigation events

## Debugging Tips

### Enable Detailed Logging

The app includes debug logging for navigation events:
- 🌐 Loading URL
- 🔄 Started loading
- ✅ Finished loading
- ❌ Navigation failed
- 🔍 Navigation decision

View logs:
```bash
# Launch app and view logs
open Arc.app
# In another terminal:
log stream --predicate 'process == "Arc"' --level debug
```

### Test with Local HTML

Create a test file to verify WebView rendering:

```html
<!DOCTYPE html>
<html>
<body>
<h1>Test Page</h1>
<p>If you can see this, WebView is working!</p>
</body>
</html>
```

Load via: `file:///path/to/test.html`

### Check Network Connectivity

Test with simple websites first:
1. `google.com` - Basic search page
2. `example.com` - Minimal HTML
3. `github.com` - Modern web app

## Project Structure

```
Arc/
├── Arc/
│   ├── Models/
│   │   └── BrowserViewModel.swift    # Navigation logic & state
│   ├── Views/
│   │   ├── BrowserView.swift         # Main UI
│   │   └── WebView.swift             # WKWebView wrapper
│   ├── ArcApp.swift                  # App entry point
│   ├── Arc.entitlements              # ⚠️ CRITICAL - Network permissions
│   └── Info.plist                    # App configuration
└── Arc.xcodeproj/
    └── project.pbxproj                # ⚠️ Must reference entitlements
```

## Performance Tips

1. **Memory Usage**: WKWebView caches content - normal to see memory increase
2. **CPU Usage**: Initial page loads may spike CPU - this is normal
3. **Network**: Check firewall settings if pages won't load

## Known Limitations

1. **Single Tab**: Multi-tab support coming in Phase 2
2. **No Downloads**: Download manager coming in Phase 2
3. **No Bookmarks**: Bookmark system coming in Phase 2
4. **WKWebView Only**: CEF integration planned for Phase 3

## Getting Help

### Check Build Configuration

1. Open project in Xcode
2. Select Arc target
3. Go to "Signing & Capabilities"
4. Verify "App Sandbox" is enabled with:
   - ✅ Incoming Connections (Server)
   - ✅ Outgoing Connections (Client)
   - ✅ Downloads Folder
   - ✅ User Selected Files

### Clean Build

If issues persist:
```bash
cd /Users/shreyasgurav/Desktop/Arc
xcodebuild clean
rm -rf ~/Library/Developer/Xcode/DerivedData/Arc-*
xcodebuild -project Arc.xcodeproj -scheme Arc build
```

### Console Output

When app is running, check for:
- Loading indicators (🌐, 🔄, ✅)
- Error messages (❌)
- URL changes

## Success Indicators

✅ App launches without errors  
✅ Address bar is visible and interactive  
✅ Google homepage loads and displays  
✅ Can search and navigate  
✅ Back/forward buttons work when applicable  
✅ Progress bar shows during loading  

---

**Last Updated**: October 9, 2025  
**Status**: Network entitlements configured and working  
**Version**: 1.0

