namespace KairosPayHub.Api.Storage;

public class R2Options
{
    public const string SectionName = "R2";

    public string? AccessKeyId { get; set; }
    public string? SecretAccessKey { get; set; }
    public string? Endpoint { get; set; }
    public string BucketName { get; set; } = "kairospayhub";
    /// <summary>Public base URL for objects, e.g. https://pub-xxx.r2.dev or https://assets.example.com</summary>
    public string? PublicBaseUrl { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(AccessKeyId)
        && !string.IsNullOrWhiteSpace(SecretAccessKey)
        && !string.IsNullOrWhiteSpace(Endpoint)
        && !string.IsNullOrWhiteSpace(PublicBaseUrl);
}
