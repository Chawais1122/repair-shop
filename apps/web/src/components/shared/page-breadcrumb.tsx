import { Fragment } from 'react';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbEntry[];
  className?: string;
}

export function PageBreadcrumb({ items, className }: Props) {
  return (
    <Breadcrumb className={className ?? 'mb-6'}>
      <BreadcrumbList>
        {items.map((item, idx) => (
          <Fragment key={`${item.label}-${idx}`}>
            {idx > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
