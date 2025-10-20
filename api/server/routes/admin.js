const express = require('express');
const path = require('path');
const { User, Conversation, Message } = require(path.join(__dirname, '../../db/models'));
const { requireJwtAuth } = require(path.join(__dirname, '../middleware'));
const checkAdmin = require(path.join(__dirname, '../middleware/roles/admin'));

const router = express.Router();

// Get all users with their conversation and message counts
router.get('/users', requireJwtAuth, checkAdmin, async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $project: {
          email: 1,
          username: 1,
          name: 1,
          role: 1,
          provider: 1,
          isRegistered: 1,
          createdAt: 1,
          updatedAt: 1,
          lastSeen: 1,
        },
      },
      {
        $lookup: {
          from: 'conversations',
          localField: '_id',
          foreignField: 'userId',
          as: 'conversations',
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'userId',
          as: 'messages',
        },
      },
      {
        $addFields: {
          conversationCount: { $size: '$conversations' },
          messageCount: { $size: '$messages' },
        },
      },
      {
        $project: {
          conversations: 0,
          messages: 0,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get user details with conversations and messages
router.get('/users/:userId', requireJwtAuth, checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId, {
      password: 0,
      totpSecret: 0,
      backupCodes: 0,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const conversations = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(20);

    const messages = await Message.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      user,
      conversations,
      messages,
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get user conversations
router.get('/users/:userId/conversations', requireJwtAuth, checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const conversations = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Conversation.countDocuments({ userId });

    res.status(200).json({
      conversations,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    console.error('Error fetching user conversations:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get user messages
router.get('/users/:userId/messages', requireJwtAuth, checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, conversationId } = req.query;
    
    const filter = { userId };
    if (conversationId) {
      filter.conversationId = conversationId;
    }
    
    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Message.countDocuments(filter);

    res.status(200).json({
      messages,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    console.error('Error fetching user messages:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Update user role
router.put('/users/:userId/role', requireJwtAuth, checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, select: '-password -totpSecret -backupCodes' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Delete user
router.delete('/users/:userId', requireJwtAuth, checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete user and all associated data
    await User.findByIdAndDelete(userId);
    await Conversation.deleteMany({ userId });
    await Message.deleteMany({ userId });
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
