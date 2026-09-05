namespace KairosPayHub.Tests.Integration;

public static class OnboardingTestHelper
{
    public static object Payload(string churchName = "Grace Assembly", string countryCode = "GH") =>
        new { churchName, countryCode };

    public static object PayloadOrg(string organizationName, string countryCode = "GH") =>
        new { organizationName, countryCode };
}
