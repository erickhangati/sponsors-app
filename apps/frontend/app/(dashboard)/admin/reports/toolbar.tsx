'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReportsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: string | null;
  onTypeFilterChange: (value: string | null) => void;
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  totalResults: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

export function ReportsToolbar({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  totalResults,
  pageSize,
  onPageSizeChange,
}: ReportsToolbarProps) {
  const clearFilters = () => {
    onSearchChange('');
    onTypeFilterChange(null);
    onStatusFilterChange(null);
  };

  const hasFilters = searchTerm || typeFilter || statusFilter;

  // Determine which page size options to show based on total results
  const getPageSizeOptions = () => {
    if (totalResults <= 10) {
      return null; // Don't show the selector at all
    } else if (totalResults <= 20) {
      return [10];
    } else if (totalResults <= 50) {
      return [10, 20, 50];
    } else {
      return [10, 20, 50, 100];
    }
  };

  const pageSizeOptions = getPageSizeOptions();

  return (
    <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Select
          value={typeFilter || 'all'}
          onValueChange={(value) => onTypeFilterChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              All Types
            </SelectItem>
            <SelectItem value="Academic" className="cursor-pointer">
              Academic
            </SelectItem>
            <SelectItem value="Health" className="cursor-pointer">
              Health
            </SelectItem>
            <SelectItem value="Financial" className="cursor-pointer">
              Financial
            </SelectItem>
            <SelectItem value="Other" className="cursor-pointer">
              Other
            </SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter || 'all'}
          onValueChange={(value) => onStatusFilterChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              All Statuses
            </SelectItem>
            <SelectItem value="read" className="cursor-pointer">
              Read
            </SelectItem>
            <SelectItem value="unread" className="cursor-pointer">
              Unread
            </SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="cursor-pointer">
            Clear Filters
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {pageSizeOptions && (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-[110px] cursor-pointer">
              <SelectValue placeholder={`${pageSize} per page`} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)} className="cursor-pointer">
                  {size} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
