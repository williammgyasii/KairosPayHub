using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Storage;

public class R2ObjectStorage(IOptions<R2Options> options) : IObjectStorage
{
    private readonly R2Options _options = options.Value;

    public bool IsConfigured => _options.IsConfigured;

    public async Task<string> UploadAsync(
        string key,
        Stream content,
        string contentType,
        CancellationToken ct = default)
    {
        if (!IsConfigured)
            throw new ObjectStorageNotConfiguredException();

        var cfg = _options;
        var creds = new BasicAWSCredentials(cfg.AccessKeyId!, cfg.SecretAccessKey!);
        var s3Config = new AmazonS3Config
        {
            ServiceURL = cfg.Endpoint!.TrimEnd('/'),
            ForcePathStyle = true,
        };

        using var client = new AmazonS3Client(creds, s3Config);
        var request = new PutObjectRequest
        {
            BucketName = cfg.BucketName,
            Key = key,
            InputStream = content,
            ContentType = contentType,
            AutoCloseStream = false,
            DisablePayloadSigning = true,
            DisableDefaultChecksumValidation = true,
        };

        await client.PutObjectAsync(request, ct);

        return PublicUrlForKey(key)!;
    }

    public string? PublicUrlForKey(string key)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(_options.PublicBaseUrl))
            return null;

        return $"{_options.PublicBaseUrl.TrimEnd('/')}/{key.TrimStart('/')}";
    }

    public async Task<(Stream Stream, string ContentType)?> TryOpenReadAsync(
        string key,
        CancellationToken ct = default)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(key))
            return null;

        var cfg = _options;
        var creds = new BasicAWSCredentials(cfg.AccessKeyId!, cfg.SecretAccessKey!);
        var s3Config = new AmazonS3Config
        {
            ServiceURL = cfg.Endpoint!.TrimEnd('/'),
            ForcePathStyle = true,
        };

        using var client = new AmazonS3Client(creds, s3Config);
        try
        {
            using var response = await client.GetObjectAsync(new GetObjectRequest
            {
                BucketName = cfg.BucketName,
                Key = key,
            }, ct);

            var buffer = new MemoryStream();
            await response.ResponseStream.CopyToAsync(buffer, ct);
            buffer.Position = 0;
            var contentType = string.IsNullOrWhiteSpace(response.Headers.ContentType)
                ? "application/octet-stream"
                : response.Headers.ContentType;
            return (buffer, contentType);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }
}
