'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  methodFilter: string | null;
  onMethodFilterChange: (value: string | null) => void;
}

export function Toolbar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  methodFilter,
  onMethodFilterChange,
}: ToolbarProps) {
  const isFiltered = !!statusFilter || !!methodFilter;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full pl-8"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              onClick={() => onSearchChange('')}
              className="absolute right-0 top-0 h-full px-2 py-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter || 'all'}
          onValueChange={(value) => onStatusFilterChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              All Statuses
            </SelectItem>
            <SelectItem value="completed" className="cursor-pointer">
              Completed
            </SelectItem>
            <SelectItem value="pending" className="cursor-pointer">
              Pending
            </SelectItem>
            <SelectItem value="failed" className="cursor-pointer">
              Failed
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={methodFilter || 'all'}
          onValueChange={(value) => onMethodFilterChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              All Methods
            </SelectItem>
            <SelectItem value="Mpesa" className="cursor-pointer">
              Mpesa
            </SelectItem>
            <SelectItem value="Bank Transfer" className="cursor-pointer">
              Bank Transfer
            </SelectItem>
            <SelectItem value="Credit Card" className="cursor-pointer">
              Credit Card
            </SelectItem>
            <SelectItem value="PayPal" className="cursor-pointer">
              PayPal
            </SelectItem>
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              onStatusFilterChange(null);
              onMethodFilterChange(null);
            }}
            className="h-8 px-2 lg:px-3 cursor-pointer"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
