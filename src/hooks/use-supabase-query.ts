import { supabase } from '@/integrations/supabase/client';

export type QueryResult<T> = {
  data: T[] | null;
  error: Error | null;
};

export async function useSupabaseQuery<T>(
  table: "expenses" | "stations" | "fuel_records" | "monthly_stock" | "product_prices" | "profiles" | "pumps" | "user_stations" | "tank_capacities" | "staff",
  query: {
    select?: string;
    eq?: { [key: string]: any };
    order?: { column: string; ascending?: boolean };
  }
): Promise<QueryResult<T>> {
  try {
    let baseQuery = supabase.from(table).select(query.select || '*') as any;

    if (query.eq) {
      Object.entries(query.eq).forEach(([key, value]) => {
        baseQuery = baseQuery.eq(key, value);
      });
    }

    if (query.order) {
      baseQuery = baseQuery.order(query.order.column, { ascending: query.order.ascending ?? true });
    }

    const { data, error } = await baseQuery;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
