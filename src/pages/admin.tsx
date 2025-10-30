import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { appWithTranslation, useTranslation } from 'next-i18next';
import Head from 'next/head';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
  };
  createdAt: string;
  lastActive: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  subscriptions: number;
  revenue: number;
}

const AdminPanel = () => {
  const { t } = useTranslation('common');
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    subscriptions: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Redirect to login if not authenticated
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (status !== 'authenticated' || session?.user?.role !== 'admin') {
    router.push('/auth/login');
    return null;
  }

  useEffect(() => {
    // Mock data - in a real app, this would come from an API
    const mockUsers: User[] = [
      {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        subscription: {
          plan: 'pro',
          status: 'active',
        },
        createdAt: '2024-01-15',
        lastActive: '2024-01-20',
      },
      {
        _id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'user',
        subscription: {
          plan: 'free',
          status: 'active',
        },
        createdAt: '2024-01-10',
        lastActive: '2024-01-19',
      },
      {
        _id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        role: 'user',
        subscription: {
          plan: 'enterprise',
          status: 'active',
        },
        createdAt: '2024-01-05',
        lastActive: '2024-01-18',
      },
      {
        _id: '4',
        name: 'Alice Brown',
        email: 'alice@example.com',
        role: 'admin',
        subscription: {
          plan: 'enterprise',
          status: 'active',
        },
        createdAt: '2024-01-01',
        lastActive: '2024-01-20',
      },
    ];

    const mockStats: AdminStats = {
      totalUsers: 1247,
      activeUsers: 892,
      subscriptions: 342,
      revenue: 15420,
    };

    setTimeout(() => {
      setUsers(mockUsers);
      setStats(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(user => user._id !== userId));
      alert('User deleted successfully');
    }
  };

  const handleSaveUser = (updatedUser: User) => {
    setUsers(users.map(user => 
      user._id === updatedUser._id ? updatedUser : user
    ));
    setShowEditModal(false);
    setSelectedUser(null);
    alert('User updated successfully');
  };

  const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-blue-500">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>{t('admin.title')} | AI Platform</title>
        <meta name="description" content="Admin panel for AI Platform" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('admin.title')}</h1>
            <p className="text-gray-300">
              Manage users, subscriptions, and platform settings
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title={t('admin.totalUsers')}
                  value={stats.totalUsers}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v-1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                />
                <StatCard
                  title={t('admin.activeUsers')}
                  value={stats.activeUsers}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatCard
                  title={t('admin.subscriptions')}
                  value={stats.subscriptions}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  }
                />
                <StatCard
                  title={t('admin.revenue')}
                  value={`$${stats.revenue.toLocaleString()}`}
                  icon={
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </div>

              {/* Users Table */}
              <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">{t('admin.users')}</h2>
                  <button className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors">
                    Add User
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">{t('admin.name')}</th>
                        <th className="text-left py-3 px-4">{t('admin.email')}</th>
                        <th className="text-left py-3 px-4">{t('admin.role')}</th>
                        <th className="text-left py-3 px-4">{t('admin.status')}</th>
                        <th className="text-left py-3 px-4">{t('admin.createdAt')}</th>
                        <th className="text-left py-3 px-4">{t('admin.lastActive')}</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id} className="border-b border-gray-700 hover:bg-gray-750">
                          <td className="py-3 px-4">{user.name}</td>
                          <td className="py-3 px-4">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin' ? 'bg-purple-600' : 'bg-gray-600'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.subscription.status === 'active' ? 'bg-green-600' : 'bg-red-600'
                            }`}>
                              {user.subscription.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">{user.createdAt}</td>
                          <td className="py-3 px-4">{user.lastActive}</td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                {t('admin.editUser')}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                {t('admin.deleteUser')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Edit User</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveUser(selectedUser);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={selectedUser.name}
                    onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value as 'user' | 'admin'})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subscription Plan</label>
                  <select
                    value={selectedUser.subscription.plan}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      subscription: {
                        ...selectedUser.subscription,
                        plan: e.target.value as 'free' | 'pro' | 'enterprise'
                      }
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default appWithTranslation(AdminPanel);

