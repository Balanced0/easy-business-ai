// Editable review grid for handwriting-scan results.
// Lets users fix mistakes before committing to their data tables.

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";

type Props = {
  columns: string[];
  rows: Record<string, string>[];
  onChange: (rows: Record<string, string>[]) => void;
};

export function ScanReviewTable({ columns, rows, onChange }: Props) {
  const updateCell = (rowIdx: number, col: string, value: string) => {
    onChange(rows.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r)));
  };
  const removeRow = (rowIdx: number) => {
    onChange(rows.filter((_, i) => i !== rowIdx));
  };
  const addRow = () => {
    const empty: Record<string, string> = {};
    for (const c of columns) empty[c] = "";
    onChange([...rows, empty]);
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c} className="capitalize">
                  {c.replace(/_/g, " ")}
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c} className="p-1">
                    <Input
                      value={row[c] ?? ""}
                      onChange={(e) => updateCell(i, c, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                ))}
                <TableCell className="p-1">
                  <Button size="icon" variant="ghost" onClick={() => removeRow(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="py-8 text-center text-sm text-muted-foreground">
                  No rows extracted.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm" onClick={addRow}>
        + Add empty row
      </Button>
    </div>
  );
}
