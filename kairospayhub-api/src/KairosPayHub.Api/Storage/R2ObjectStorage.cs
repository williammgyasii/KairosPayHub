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
        };

        await client.PutObjectAsync(request, ct);

        return $"{cfg.PublicBaseUrl!.TrimEnd('/')}/{key}";
    }
}
