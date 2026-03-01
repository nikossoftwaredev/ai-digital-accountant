import { setRequestLocale } from "next-intl/server";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TypographyH3, TypographyRegular } from "@/components/ui/typography";
import { getStatusColor } from "@/lib/admin/utils";
import { BasePageProps } from "@/types/page-props";

const mockUsers = [
  { id: 1, name: "Alex Johnson", email: "alex@example.com", role: "Admin", status: "Active", joined: "2024-01-15" },
  { id: 2, name: "Maria Garcia", email: "maria@example.com", role: "Editor", status: "Active", joined: "2024-02-20" },
  { id: 3, name: "James Wilson", email: "james@example.com", role: "Viewer", status: "Inactive", joined: "2024-03-10" },
  { id: 4, name: "Sofia Chen", email: "sofia@example.com", role: "Editor", status: "Active", joined: "2024-04-05" },
  { id: 5, name: "Nikos Papadopoulos", email: "nikos@example.com", role: "Admin", status: "Active", joined: "2024-05-12" },
  { id: 6, name: "Emma Brown", email: "emma@example.com", role: "Viewer", status: "Pending", joined: "2024-06-01" },
];

const UsersPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div>
        <TypographyH3>Users</TypographyH3>
        <TypographyRegular className="text-muted-foreground">
          Manage your team members and their permissions.
        </TypographyRegular>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{mockUsers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600 dark:text-green-400">
              {mockUsers.filter((u) => u.status === "Active").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-3xl text-blue-600 dark:text-blue-400">
              {mockUsers.filter((u) => u.role === "Admin").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>A list of all users in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "Admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{user.joined}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="size-8" aria-label="More actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
