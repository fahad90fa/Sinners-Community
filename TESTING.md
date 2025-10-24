# Testing Guide - Social Media Platform

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
# or
bun install
```

### 2. Environment Setup
Ensure `.env` file has:
```
VITE_SUPABASE_PROJECT_ID=lctyqbgxehevjolsfxxi
VITE_SUPABASE_PUBLISHABLE_KEY=<your_key>
VITE_SUPABASE_URL=https://lctyqbgxehevjolsfxxi.supabase.co
VITE_ADMIN_ACCESS_CODE=fahad123@fa
```

### 3. Start Development Server
```bash
npm run dev
# or
bun run dev
```

Visit `http://localhost:5173`

## Test Scenarios

### User Authentication

**Test Case 1: User Registration**
1. Navigate to `/signup`
2. Enter email, password, username, display name
3. Click "Sign up"
4. **Expected**: User created, profile populated, redirected to feed

**Test Case 2: User Login**
1. Navigate to `/login`
2. Enter registered email and password
3. Click "Log in"
4. **Expected**: Authenticated, redirected to feed, navbar shows user avatar

**Test Case 3: User Logout**
1. From any page, click logout button in navbar
2. **Expected**: Session cleared, redirected to landing page

---

### Core Engagement Features

**Test Case 4: Like/Unlike Posts**
1. Navigate to `/feed` (logged in)
2. Find a post card
3. Click heart icon
4. **Expected**: Heart fills, like count increases
5. Click again
6. **Expected**: Heart empties, like count decreases

**Test Case 5: Add Comments**
1. On a post, click comment icon or "View all comments"
2. Type a comment (e.g., "Great post! #awesome")
3. Click "Post comment"
4. **Expected**: Comment appears in list, count increases, notification sent to post owner

**Test Case 6: Delete Comments**
1. In comments section, find your comment
2. Click "Delete" button
3. **Expected**: Comment removed, count decreases

**Test Case 7: Save/Bookmark Posts**
1. On any post, click bookmark icon
2. **Expected**: Icon fills, post saved
3. Navigate to `/saved`
4. **Expected**: Saved post appears in list
5. Click bookmark again on any post
6. **Expected**: Icon empties, post removed from saved list

**Test Case 8: Edit Post Caption**
1. On your own post, click menu (three dots)
2. Click "Edit post"
3. Modify caption text
4. Click "Save"
5. **Expected**: Caption updated, visible immediately

**Test Case 9: Delete Post**
1. On your own post, click menu (three dots)
2. Click "Delete post"
3. Confirm deletion
4. **Expected**: Post disappears from feed, database deleted

---

### Content Features - Hashtags

**Test Case 10: Create Post with Hashtags**
1. Navigate to `/create`
2. Upload an image/video
3. In caption, type: "Beautiful sunset #nature #photography #landscape"
4. Post the content
5. **Expected**: Hashtags saved to database

**Test Case 11: Click Hashtag Link**
1. On feed, find post with hashtags
2. Click on a hashtag (e.g., #nature)
3. **Expected**: Redirected to `/explore/hashtag/nature`

**Test Case 12: Hashtag Explore Page**
1. Navigate to `/explore/hashtag/nature`
2. **Expected**: All posts tagged with #nature displayed
3. Post count shown at top
4. Each post clickable and interactive

---

### Content Features - Mentions

**Test Case 13: Mention User in Comment**
1. Open comments on any post
2. Start typing a comment with "@" (e.g., "@username great post!")
3. **Expected**: Auto-complete dropdown appears with matching usernames
4. Click on username or press Enter
5. **Expected**: Mention inserted with proper formatting
6. Submit comment
7. **Expected**: Mentioned user receives notification

**Test Case 14: Display Mentions**
1. View comment with mention (e.g., "@john")
2. **Expected**: Username appears as clickable blue link
3. Click mention link
4. **Expected**: Searches for that user

---

### Social Features - Direct Messaging

**Test Case 15: Real-time Messaging**
1. Navigate to `/chat`
2. Wait for "Online" status
3. **Expected**: Active users list populated
4. Click on another user
5. **Expected**: Chat interface opens
6. Type message and press Send
7. **Expected**: Message appears in chat (sent position)
8. Open chat in another browser/session for that user
9. **Expected**: Message received in real-time

**Test Case 16: Typing Indicators**
1. In chat, start typing message
2. **Expected**: "typing..." indicator appears for recipient
3. Stop typing
4. Wait 3 seconds
5. **Expected**: Typing indicator disappears

**Test Case 17: Connection Status**
1. On chat page, check status indicator
2. When connected: Green "Live" indicator
3. Disconnect internet
4. **Expected**: "Offline" indicator shows red
5. Reconnect
6. **Expected**: "Online" indicator returns

---

### User Discovery

**Test Case 18: User Suggestions**
1. Navigate to `/profile` or view user suggestions component
2. **Expected**: List of suggested users appears
3. Shows mutual follower count
4. Click "Follow" button
5. **Expected**: Button changes to "Following", user added to follows

**Test Case 19: Explore Search**
1. Navigate to `/explore`
2. In search field, type username or partial name
3. **Expected**: Real-time search results appear as you type
4. Click on user result
5. **Expected**: Profile page loads for that user

**Test Case 20: Trending Posts**
1. Navigate to `/explore`
2. **Expected**: "Trending today" section shows 6 posts
3. Posts ordered by engagement (likes) and recency
4. Hover over post thumbnail
5. **Expected**: Post details appear with overlay

---

### Notifications

**Test Case 21: Receive Like Notification**
1. User A likes post from User B
2. User B navigates to `/notifications`
3. **Expected**: "User A liked your post" appears at top
4. Unread count badge shows

**Test Case 22: Receive Comment Notification**
1. User A comments on User B's post
2. User B navigates to `/notifications`
3. **Expected**: "User A commented on your post" appears

**Test Case 23: Receive Follow Notification**
1. User A follows User B
2. User B navigates to `/notifications`
3. **Expected**: "User A started following you" appears

**Test Case 24: Receive Mention Notification**
1. User A mentions User B in a comment
2. User B navigates to `/notifications`
3. **Expected**: "User A mentioned you in a comment" appears

**Test Case 25: Mark All as Read**
1. On `/notifications` with unread items
2. Click "Mark all as read"
3. **Expected**: "New" badges disappear, counter shows "No unread"

---

### Safety Features

**Test Case 26: Block User**
1. Navigate to user profile (not own)
2. Click menu, select "Block user"
3. **Expected**: User added to blocks table
4. Blocked user cannot see your posts
5. Navigate to `/explore`
6. **Expected**: Blocked user doesn't appear in suggestions

**Test Case 27: Report Post**
1. On any post not your own, click menu
2. Click "Report post"
3. Select reason (e.g., "Spam")
4. Add description (optional)
5. Click "Submit report"
6. **Expected**: Report saved to database, success message

**Test Case 28: Privacy Settings**
1. Navigate to `/profile`
2. Click settings (gear icon)
3. Toggle "Private account"
4. **Expected**: Profile set to private
5. Non-followers cannot see posts

---

### Stories

**Test Case 29: Create Story**
1. Navigate to `/profile`
2. Click "Add Story" button
3. Select image or video file
4. Add optional caption
5. Click "Post story"
6. **Expected**: Story appears in stories section, auto-expires in 24 hours

**Test Case 30: View Story**
1. From profile, click on story thumbnail
2. **Expected**: Story viewer opens showing image/video
3. Caption displays if added
4. Close viewer
5. **Expected**: Returns to profile

---

### Profile Features

**Test Case 31: Edit Profile**
1. Navigate to `/profile`
2. Click "Edit profile"
3. Update display name, bio, avatar
4. Click "Save changes"
5. **Expected**: Profile updated immediately, changes visible

**Test Case 32: View Own Posts**
1. On `/profile`
2. **Expected**: All your posts displayed in grid
3. Each post shows like count and engagement metrics

**Test Case 33: View Other User Profile**
1. From `/explore`, click on user
2. **Expected**: User's public posts displayed
3. Follow/unfollow button visible (if not already following)
4. User's bio, profile picture, follower count shown

---

### Feed & Algorithm

**Test Case 34: Personalized Feed**
1. Login as user who follows other users
2. Navigate to `/feed`
3. **Expected**: Posts from followed users appear
4. Ordered by most recent first
5. Engagement metrics displayed

**Test Case 35: Empty Feed**
1. New user with no follows
2. Navigate to `/feed`
3. **Expected**: Empty state message
4. Suggestion to follow people or create posts

---

## Performance Testing

**Test Case 36: Load 20+ Posts**
1. Create/ensure 20+ posts exist
2. Navigate to `/feed` or `/explore`
3. Scroll through posts
4. **Expected**: No lag, smooth scrolling
5. Images load properly
6. Comments load on demand

**Test Case 37: Large Comment Section**
1. Post with 50+ comments
2. Click to view comments
3. **Expected**: All comments load, scrollable
4. No UI freeze or slowdown

---

## Error Handling

**Test Case 38: Network Error**
1. Disconnect internet while on app
2. Try to like/comment/message
3. **Expected**: Error toast appears with helpful message
4. Action queued/retried when reconnected

**Test Case 39: Invalid Input**
1. Try to post empty caption
2. Try to comment with empty text
3. **Expected**: Validation error, cannot submit

**Test Case 40: Authentication Error**
1. Try to access `/profile` without login
2. **Expected**: Redirected to `/login`

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Accessibility

**Test Case 41: Keyboard Navigation**
- [ ] Tab through all interactive elements
- [ ] Enter/Space activate buttons
- [ ] Escape closes modals
- [ ] Mention suggestions navigable with arrow keys

**Test Case 42: Screen Reader**
- [ ] Icons have proper ARIA labels
- [ ] Form inputs properly labeled
- [ ] Notifications announced

---

## Quick Smoke Test (5 minutes)

1. ✅ Sign up / Login
2. ✅ Create post with #hashtag
3. ✅ Like a post, view saved
4. ✅ Comment with @mention
5. ✅ Send direct message
6. ✅ View notifications
7. ✅ Edit profile
8. ✅ Create story

If all green: **Platform functional** ✨

---

## Reporting Issues

When reporting bugs, include:
- **Test case number**
- **Steps to reproduce**
- **Expected result**
- **Actual result**
- **Browser/OS**
- **Screenshots**

---

**Last Updated**: October 2025
**Status**: Ready for comprehensive testing
