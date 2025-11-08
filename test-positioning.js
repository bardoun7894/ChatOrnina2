// Test script to verify mobile menu button positioning
const fs = require('fs');
const path = require('path');

// Read the Chat.tsx file
const chatFilePath = path.join(__dirname, 'src/components/HomeChat/Chat.tsx');
const chatContent = fs.readFileSync(chatFilePath, 'utf8');

// Check if the positioning logic is correct
console.log('Checking Chat.tsx for mobile menu button positioning...');

// Check for RTL positioning
if (chatContent.includes("isRTL ? 'left' : 'right'")) {
  console.log('✓ Chat.tsx: RTL positioning logic found');
} else {
  console.log('✗ Chat.tsx: RTL positioning logic not found');
}

// Check for inline styles
if (chatContent.includes("[isRTL ? 'left' : 'right']: '8px'")) {
  console.log('✓ Chat.tsx: Inline styles for positioning found');
} else {
  console.log('✗ Chat.tsx: Inline styles for positioning not found');
}

// Read the chatgpt-clone.tsx file
const cloneFilePath = path.join(__dirname, 'src/pages/chatgpt-clone.tsx');
const cloneContent = fs.readFileSync(cloneFilePath, 'utf8');

// Check for RTL positioning
if (cloneContent.includes("isRTL ? 'left' : 'right'")) {
  console.log('✓ chatgpt-clone.tsx: RTL positioning logic found');
} else {
  console.log('✗ chatgpt-clone.tsx: RTL positioning logic not found');
}

// Check for inline styles
if (cloneContent.includes("[isRTL ? 'left' : 'right']: '8px'")) {
  console.log('✓ chatgpt-clone.tsx: Inline styles for positioning found');
} else {
  console.log('✗ chatgpt-clone.tsx: Inline styles for positioning not found');
}

console.log('\nTest completed!');








