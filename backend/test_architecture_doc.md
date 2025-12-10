# DataOps Architecture Guidelines

1. **Bronze Layer**: Raw data ingestion. No transformations.
2. **Silver Layer**: Cleaned and conformed data. Deduplication and schema validation applied.
3. **Gold Layer**: Aggregated business-level data for reporting and ML.

All pipelines must be orchestrated via Airflow.
