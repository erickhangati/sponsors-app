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

interface ChildrenToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  genderFilter: string | null;
  onGenderFilterChange: (value: string | null) => void;
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  totalResults: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

export function ChildrenToolbar({
  searchTerm,
  onSearchChange,
  genderFilter,
  onGenderFilterChange,
  statusFilter,
  onStatusFilterChange,
  totalResults,
  pageSize,
  onPageSizeChange,
}: ChildrenToolbarProps) {
  const clearFilters = () => {
    onSearchChange('');
    onGenderFilterChange(null);
    onStatusFilterChange(null);
  };

  const hasFilters = searchTerm || genderFilter || statusFilter;

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
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search children..."
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
          value={genderFilter || 'all'}
          onValueChange={(value) => onGenderFilterChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[150px] cursor-pointer">
            <SelectValue placeholder="Filter by gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              All Genders
            </SelectItem>
            <SelectItem value="Male" className="cursor-pointer">
              Male
            </SelectItem>
            <SelectItem value="Female" className="cursor-pointer">
              Female
            </SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter || 'all'}
          onValueChange={(value) => onStatusFilterChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[150px] cursor-pointer">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              All Status
            </SelectItem>
            <SelectItem value="active" className="cursor-pointer">
              Active
            </SelectItem>
            <SelectItem value="inactive" className="cursor-pointer">
              Inactive
            </SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
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
