export function hasPermission(
  user: { permissions: string[] },
  permission: string,
) {
  return user.permissions.includes(permission)
}
