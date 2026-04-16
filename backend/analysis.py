import pandas as pd
import numpy as np
import sqlite3
from database import get_db_connection
from fastapi import HTTPException


def _df():
    """Load the sales table into a DataFrame."""
    conn = get_db_connection()
    try:
        df = pd.read_sql("SELECT * FROM sales", conn)
    except Exception:
        raise HTTPException(404, "No data uploaded yet. Please upload a CSV/Excel file first.")
    finally:
        conn.close()
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    df['revenue'] = pd.to_numeric(df['revenue'], errors='coerce').fillna(0)
    df['quantity'] = pd.to_numeric(df.get('quantity', 0), errors='coerce').fillna(0)
    return df


def get_summary_stats():
    df = _df()
    prev_half = df[df['date'] < df['date'].median()]
    curr_half = df[df['date'] >= df['date'].median()]
    prev_rev = prev_half['revenue'].sum()
    curr_rev = curr_half['revenue'].sum()
    growth = ((curr_rev - prev_rev) / prev_rev * 100) if prev_rev else 0

    return {
        "total_revenue": round(df['revenue'].sum(), 2),
        "total_orders": len(df),
        "avg_order_value": round(df['revenue'].mean(), 2),
        "total_units_sold": int(df['quantity'].sum()),
        "revenue_growth_pct": round(growth, 1),
        "top_region": df.groupby('region')['revenue'].sum().idxmax() if 'region' in df.columns else "N/A",
        "top_product": df.groupby('product')['revenue'].sum().idxmax() if 'product' in df.columns else "N/A",
        "date_range": {
            "from": df['date'].min().strftime('%Y-%m-%d'),
            "to": df['date'].max().strftime('%Y-%m-%d')
        }
    }


def get_revenue_by_period(period: str = "monthly"):
    df = _df()
    if period == "monthly":
        df['period'] = df['date'].dt.to_period('M').astype(str)
    elif period == "quarterly":
        df['period'] = df['date'].dt.to_period('Q').astype(str)
    elif period == "weekly":
        df['period'] = df['date'].dt.to_period('W').astype(str)
    else:
        df['period'] = df['date'].dt.to_period('M').astype(str)

    result = (
        df.groupby('period')
        .agg(revenue=('revenue', 'sum'), orders=('revenue', 'count'), units=('quantity', 'sum'))
        .reset_index()
        .sort_values('period')
    )
    return result.to_dict('records')


def get_top_products(limit: int = 10):
    df = _df()
    result = (
        df.groupby('product')
        .agg(revenue=('revenue', 'sum'), orders=('revenue', 'count'), units=('quantity', 'sum'))
        .reset_index()
        .sort_values('revenue', ascending=False)
        .head(limit)
    )
    result['revenue'] = result['revenue'].round(2)
    return result.to_dict('records')


def get_regional_breakdown():
    df = _df()
    total = df['revenue'].sum()
    result = (
        df.groupby('region')
        .agg(revenue=('revenue', 'sum'), orders=('revenue', 'count'))
        .reset_index()
        .sort_values('revenue', ascending=False)
    )
    result['share_pct'] = (result['revenue'] / total * 100).round(1)
    result['revenue'] = result['revenue'].round(2)
    return result.to_dict('records')


def get_forecast(periods: int = 6):
    """Simple linear regression forecast on monthly revenue."""
    df = _df()
    monthly = (
        df.groupby(df['date'].dt.to_period('M'))['revenue']
        .sum()
        .reset_index()
        .sort_values('date')
    )
    monthly.columns = ['period', 'revenue']
    monthly['t'] = range(len(monthly))

    if len(monthly) < 3:
        raise HTTPException(400, "Need at least 3 months of data for forecasting.")

    # Linear regression
    t = monthly['t'].values
    r = monthly['revenue'].values
    coeffs = np.polyfit(t, r, 1)
    slope, intercept = coeffs

    # Historical
    history = [
        {"period": str(row['period']), "revenue": round(row['revenue'], 2), "type": "actual"}
        for _, row in monthly.iterrows()
    ]

    # Forecast
    last_t = monthly['t'].max()
    last_period = monthly['period'].iloc[-1]
    forecast = []
    for i in range(1, periods + 1):
        future_t = last_t + i
        future_period = (last_period + i).strftime('%Y-%m')
        predicted = max(0, slope * future_t + intercept)
        # Add slight confidence interval
        std = np.std(r - (slope * t + intercept))
        forecast.append({
            "period": future_period,
            "revenue": round(predicted, 2),
            "lower": round(max(0, predicted - 1.96 * std), 2),
            "upper": round(predicted + 1.96 * std, 2),
            "type": "forecast"
        })

    return {
        "history": history,
        "forecast": forecast,
        "trend": "upward" if slope > 0 else "downward",
        "monthly_growth": round(slope, 2)
    }


def run_sql_query(query: str):
    """Run an arbitrary (read-only) SQL query and return results."""
    # Safety: only SELECT
    q = query.strip().upper()
    if not q.startswith("SELECT"):
        return {"error": "Only SELECT queries are allowed."}
    conn = get_db_connection()
    try:
        df = pd.read_sql(query, conn)
        return {
            "columns": list(df.columns),
            "rows": df.head(50).to_dict('records'),
            "total_rows": len(df)
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()
