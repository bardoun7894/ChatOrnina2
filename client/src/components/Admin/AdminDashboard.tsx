import React, { useState, useEffect } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';
import { useToastContext } from '@librechat/client';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@librechat/client';

interface User {
  _id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
  conversationCount: number;
  messageCount: number;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuthContext();
  const { showToast } = useToastContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast({ status: 'error', message: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user role');
      }
      
      showToast({ status: 'success', message: 'User role updated successfully' });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      showToast({ status: 'error', message: 'Failed to update user role' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      showToast({ status: 'success', message: 'User deleted successfully' });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast({ status: 'error', message: 'Failed to delete user' });
    }
  };

  if (user?.role !== 'admin') {
    return <div className="p-4 text-center">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">User Management</h2>
        
        {loading ? (
          <div className="text-center py-4">Loading users...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Conversations</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user._id, e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </TableCell>
                  <TableCell>{user.conversationCount}</TableCell>
                  <TableCell>{user.messageCount}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleViewUser(user)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user._id)}
                        disabled={user._id === user?._id}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      
      {showUserDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setShowUserDetails(false)}
        />
      )}
    </div>
  );
};

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, onClose }) => {
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conversations' | 'messages'>('conversations');

  useEffect(() => {
    fetchUserDetails();
  }, [user._id]);

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      
      const data = await response.json();
      setUserDetails(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">User Details: {user.email}</h2>
          <Button onClick={onClose}>Close</Button>
        </div>
        
        {loading ? (
          <div className="text-center py-4">Loading user details...</div>
        ) : userDetails ? (
          <div>
            <div className="mb-4">
              <h3 className="font-semibold mb-2">User Information</h3>
              <p><strong>Email:</strong> {userDetails.user.email}</p>
              <p><strong>Username:</strong> {userDetails.user.username}</p>
              <p><strong>Name:</strong> {userDetails.user.name}</p>
              <p><strong>Role:</strong> {userDetails.user.role}</p>
              <p><strong>Provider:</strong> {userDetails.user.provider}</p>
              <p><strong>Registered:</strong> {new Date(userDetails.user.createdAt).toLocaleString()}</p>
            </div>
            
            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                <Button
                  variant={activeTab === 'conversations' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('conversations')}
                >
                  Conversations ({userDetails.conversations.length})
                </Button>
                <Button
                  variant={activeTab === 'messages' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('messages')}
                >
                  Messages ({userDetails.messages.length})
                </Button>
              </div>
              
              {activeTab === 'conversations' && (
                <div>
                  <h3 className="font-semibold mb-2">Recent Conversations</h3>
                  {userDetails.conversations.length > 0 ? (
                    <div className="space-y-2">
                      {userDetails.conversations.map((conv: any) => (
                        <div key={conv._id} className="border rounded p-2">
                          <p><strong>Title:</strong> {conv.title}</p>
                          <p><strong>Model:</strong> {conv.model}</p>
                          <p><strong>Created:</strong> {new Date(conv.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No conversations found</p>
                  )}
                </div>
              )}
              
              {activeTab === 'messages' && (
                <div>
                  <h3 className="font-semibold mb-2">Recent Messages</h3>
                  {userDetails.messages.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {userDetails.messages.map((msg: any) => (
                        <div key={msg._id} className="border rounded p-2">
                          <p><strong>Sender:</strong> {msg.sender}</p>
                          <p><strong>Message:</strong> {msg.message.substring(0, 100)}{msg.message.length > 100 ? '...' : ''}</p>
                          <p><strong>Date:</strong> {new Date(msg.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No messages found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>Failed to load user details</div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;



