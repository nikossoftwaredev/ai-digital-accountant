import { setRequestLocale } from "next-intl/server";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TypographyH3, TypographyRegular } from "@/components/ui/typography";
import { getStatusColor } from "@/lib/admin/utils";
import { BasePageProps } from "@/types/page-props";

const mockExpenses = [
  { id: 1, description: "Cloud hosting (AWS)", amount: 450.00, category: "Infrastructure", date: "2024-06-01", status: "Approved" },
  { id: 2, description: "Design software license", amount: 29.99, category: "Software", date: "2024-06-03", status: "Approved" },
  { id: 3, description: "Team lunch meeting", amount: 185.50, category: "Meals", date: "2024-06-05", status: "Pending" },
  { id: 4, description: "Conference tickets (x2)", amount: 800.00, category: "Events", date: "2024-06-08", status: "Approved" },
  { id: 5, description: "Office supplies", amount: 67.30, category: "Office", date: "2024-06-10", status: "Pending" },
  { id: 6, description: "Marketing campaign", amount: 1200.00, category: "Marketing", date: "2024-06-12", status: "Rejected" },
];

const totalAmount = mockExpenses.reduce((sum, e) => sum + e.amount, 0);
const approvedAmount = mockExpenses.filter((e) => e.status === "Approved").reduce((sum, e) => sum + e.amount, 0);
const pendingAmount = mockExpenses.filter((e) => e.status === "Pending").reduce((sum, e) => sum + e.amount, 0);

const formatCurrency = (amount: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(amount);

const ExpensesPage = async ({ params }: BasePageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div>
        <TypographyH3>Expenses</TypographyH3>
        <TypographyRegular className="text-muted-foreground">
          Track and manage your organization&apos;s expenses.
        </TypographyRegular>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalAmount, locale)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600 dark:text-green-400">
              {formatCurrency(approvedAmount, locale)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl text-yellow-600 dark:text-yellow-400">
              {formatCurrency(pendingAmount, locale)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>A detailed list of all expense records.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{expense.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(expense.amount, locale)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(expense.status)}>
                      {expense.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{expense.date}</TableCell>
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

export default ExpensesPage;
