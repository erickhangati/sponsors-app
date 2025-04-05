'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Search, Filter } from 'lucide-react';

interface ReportsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: string | null;
  onTypeFilterChange: (value: string | null) => void;
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  reportTypes: string[];
}

export function ReportsToolbar({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  reportTypes,
}: ReportsToolbarProps) {
  // Clear all filters
  const clearFilters = () => {
    onSearchChange('');
    onTypeFilterChange(null);
    onStatusFilterChange(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search input */}
        <div className="flex-1 flex items-center relative">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              onClick={() => onSearchChange('')}
              className="absolute right-0 h-full px-3 py-2 hover:bg-transparent"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* Report Type filter */}
        <div className="w-full sm:w-[180px]">
          <Select
            value={typeFilter || 'all_types'}
            onValueChange={(value) => onTypeFilterChange(value === 'all_types' ? null : value)}
          >
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_types" className="cursor-pointer">
                All Types
              </SelectItem>
              {reportTypes.map((type) => (
                <SelectItem key={type} value={type} className="cursor-pointer">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status filter - moved to the far right */}
        <div className="w-full sm:w-[180px] sm:ml-auto flex justify-end">
          <Select
            value={statusFilter || 'all_statuses'}
            onValueChange={(value) => onStatusFilterChange(value === 'all_statuses' ? null : value)}
          >
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_statuses" className="cursor-pointer">
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
        </div>

        {/* Clear filters button */}
        {(searchTerm || typeFilter || statusFilter) && (
          <Button variant="outline" onClick={clearFilters} className="cursor-pointer">
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active filters */}
      {(typeFilter || statusFilter) && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Active filters:</span>
          </div>

          {typeFilter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {typeFilter}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTypeFilterChange(null)}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {statusFilter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {statusFilter === 'read' ? 'Read' : 'Unread'}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStatusFilterChange(null)}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
