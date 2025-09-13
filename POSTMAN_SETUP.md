# 🚀 Postman Collection Setup Guide

## Quick Start Instructions

### 1. Import Files
1. Open Postman
2. Click **Import** button
3. Import both files:
   - `Realtime-Notes-API.postman_collection.json`
   - `Realtime-Notes-Environment.postman_environment.json`

### 2. Set Environment
1. Click the **Environment** dropdown (top right)
2. Select **"Realtime Notes Environment"**
3. Verify `baseUrl` is set to `http://localhost:3000`

### 3. Authentication (IMPORTANT!)
**You MUST authenticate first before using any protected endpoints:**

#### Option A: Register New User
1. Go to **Authentication** → **Register User**
2. Click **Send**
3. Token will be automatically saved to environment

#### Option B: Login Existing User
1. Go to **Authentication** → **Login User**
2. Click **Send**
3. Token will be automatically saved to environment

### 4. Test Protected Endpoints
Now you can use any endpoint in:
- **Notes** folder
- **Folders** folder

The `{{authToken}}` variable will automatically include your JWT token.

## 🔧 Troubleshooting

### "Missing or invalid token" Error
**Solution:** You need to authenticate first!
1. Run **Register User** or **Login User** first
2. Check the **Console** tab in Postman to see "Token saved to environment"
3. Then try your protected endpoint again

### Server Not Running
**Solution:** Start the server
```bash
npm run dev
```
Server should show: `🚀 Server running at http://localhost:3000`

### Wrong Port
**Solution:** Check your environment
- Make sure `baseUrl` in environment is `http://localhost:3000`
- Or update the port in your `.env` file

## 📋 Test Flow Example

1. **Register User** → Get token automatically
2. **Create Folder** → Should work with token
3. **Create Note** → Should work with token
4. **Get All Notes** → Should return your notes
5. **Search Notes** → Test search functionality

## 🎯 Environment Variables

- `baseUrl`: http://localhost:3000
- `authToken`: Auto-populated from login/register
- `userId`: Auto-populated from login/register
- `noteId`: Set to "1" for testing
- `folderId`: Set to "1" for testing
- `searchQuery`: Set to "example" for testing

## Success Indicators

- **200 OK** responses for successful operations
- **201 Created** for new resources
- **204 No Content** for deletions
- **401 Unauthorized** means you need to authenticate first
