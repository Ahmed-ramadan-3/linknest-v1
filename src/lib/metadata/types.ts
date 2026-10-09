/**
 * Contract for the optional, future metadata service (see docs/METADATA_API.md).
 * Version 1 never calls it: FEATURES.metadataApi is false and no endpoint exists.
 * A later version can implement MetadataProvider with a fetch to /api/metadata and
 * plug it into the add-resource form without touching the storage layer.
 */
export interface LinkMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export interface MetadataProvider {
  fetchMetadata(url: string, signal?: AbortSignal): Promise<LinkMetadata | null>;
}
