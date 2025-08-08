'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, UserCheck, UserX, Shield, Ban, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

interface User {
  id: string
  hubspot_id: string
  email: string
  display_name: string
  role: 'participant' | 'voter' | 'organizer' | 'super_admin'
  verification_status: 'pending' | 'verified' | 'rejected'
  is_suspended?: boolean
  suspension_reason?: string
  created_at: string
  updated_at: string
}

interface UserManagementProps {
  initialUsers?: User[]
}

export function UserManagement({ initialUsers = [] }: UserManagementProps) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [verificationFilter, setVerificationFilter] = useState<string>('all')
  const [suspendedFilter, setSuspendedFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [searchTerm, roleFilter, verificationFilter, suspendedFilter])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (verificationFilter !== 'all') params.append('verification_status', verificationFilter)
      if (suspendedFilter !== 'all') params.append('suspended', suspendedFilter)

      const response = await fetch(`/api/admin/users?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = async (userId: string, updates: Partial<User>) => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          ...updates
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(prev => 
          prev.map(u => u.id === userId ? { ...u, ...data.user } : u)
        )
        setSelectedUser(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user')
    } finally {
      setIsUpdating(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'organizer':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'voter':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'participant':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getVerificationBadgeColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const pendingUsers = filteredUsers.filter(u => u.verification_status === 'pending')
  const verifiedUsers = filteredUsers.filter(u => u.verification_status === 'verified')
  const suspendedUsers = filteredUsers.filter(u => u.is_suspended)

  if (!currentUser || currentUser.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to manage users.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and verification status
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">
            Total Users: {users.length}
          </Badge>
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending: {pendingUsers.length}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="participant">Participant</SelectItem>
                  <SelectItem value="voter">Voter</SelectItem>
                  <SelectItem value="organizer">Organizer</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Verification</Label>
              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={suspendedFilter} onValueChange={setSuspendedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="false">Active</SelectItem>
                  <SelectItem value="true">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Users ({filteredUsers.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingUsers.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({verifiedUsers.length})</TabsTrigger>
          <TabsTrigger value="suspended">Suspended ({suspendedUsers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <UserList 
            users={filteredUsers} 
            onUserSelect={setSelectedUser}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <UserList 
            users={pendingUsers} 
            onUserSelect={setSelectedUser}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          <UserList 
            users={verifiedUsers} 
            onUserSelect={setSelectedUser}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="suspended" className="space-y-4">
          <UserList 
            users={suspendedUsers} 
            onUserSelect={setSelectedUser}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={updateUser}
          isUpdating={isUpdating}
          currentUserId={currentUser.id}
        />
      )}
    </div>
  )

  function UserList({ users, onUserSelect, isLoading }: {
    users: User[]
    onUserSelect: (user: User) => void
    isLoading: boolean
  }) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (users.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No users found matching the current filters.</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold">{user.display_name}</h4>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role.replace('_', ' ')}
                  </Badge>
                  <Badge className={getVerificationBadgeColor(user.verification_status)}>
                    {getVerificationIcon(user.verification_status)}
                    <span className="ml-1">{user.verification_status}</span>
                  </Badge>
                  {user.is_suspended && (
                    <Badge variant="destructive">
                      <Ban className="h-3 w-3 mr-1" />
                      Suspended
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUserSelect(user)}
                  >
                    Manage
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
}

function UserDetailsModal({ 
  user, 
  onClose, 
  onUpdate, 
  isUpdating, 
  currentUserId 
}: {
  user: User
  onClose: () => void
  onUpdate: (userId: string, updates: Partial<User>) => void
  isUpdating: boolean
  currentUserId: string
}) {
  const [role, setRole] = useState(user.role)
  const [verificationStatus, setVerificationStatus] = useState(user.verification_status)
  const [isSuspended, setIsSuspended] = useState(user.is_suspended || false)
  const [suspensionReason, setSuspensionReason] = useState(user.suspension_reason || '')

  const handleUpdate = () => {
    const updates: Partial<User> = {}
    
    if (role !== user.role) updates.role = role
    if (verificationStatus !== user.verification_status) updates.verification_status = verificationStatus
    if (isSuspended !== user.is_suspended) updates.is_suspended = isSuspended
    if (suspensionReason !== user.suspension_reason) updates.suspension_reason = suspensionReason

    if (Object.keys(updates).length > 0) {
      onUpdate(user.id, updates)
    } else {
      onClose()
    }
  }

  const isSelfEdit = user.id === currentUserId

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Manage User: {user.display_name}</CardTitle>
          <CardDescription>
            Update user role, verification status, and account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select 
              value={role} 
              onValueChange={(value: any) => setRole(value)}
              disabled={isSelfEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="participant">Participant</SelectItem>
                <SelectItem value="voter">Voter</SelectItem>
                <SelectItem value="organizer">Organizer</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            {isSelfEdit && (
              <p className="text-xs text-muted-foreground">
                You cannot modify your own role
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Verification Status</Label>
            <Select 
              value={verificationStatus} 
              onValueChange={(value: any) => setVerificationStatus(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="suspended"
                checked={isSuspended}
                onChange={(e) => setIsSuspended(e.target.checked)}
                disabled={isSelfEdit}
              />
              <Label htmlFor="suspended">Suspend Account</Label>
            </div>
            {isSelfEdit && (
              <p className="text-xs text-muted-foreground">
                You cannot suspend your own account
              </p>
            )}
          </div>

          {isSuspended && (
            <div className="space-y-2">
              <Label htmlFor="reason">Suspension Reason</Label>
              <Input
                id="reason"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Enter reason for suspension..."
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1"
            >
              {isUpdating ? 'Updating...' : 'Update User'}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}