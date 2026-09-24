using KairosPayHub.Api.Outreach;

namespace KairosPayHub.Tests.Unit;

public class PublishedEmailReaderTests
{
    [Fact]
    public void Decodes_html_character_references_on_the_contact_page()
    {
        const string contact = "<p>Email: inf&#111;&#064;madisonchristian.org</p>";

        var email = PublishedEmailReader.Choose(contact, homeHtml: null, "https://www.madisonchristian.org/");

        Assert.Equal("info@madisonchristian.org", email);
    }

    [Fact]
    public void Returns_nothing_when_neither_page_has_an_address()
    {
        var email = PublishedEmailReader.Choose("<p>Call the office</p>", "<p>Welcome</p>", "https://thechurch.example");

        Assert.Null(email);
    }

    [Fact]
    public void Prefers_an_address_on_the_church_host()
    {
        const string contact = "<p>office@thechurch.example vendor@other.test</p>";

        var email = PublishedEmailReader.Choose(contact, homeHtml: null, "https://www.thechurch.example/contact");

        Assert.Equal("office@thechurch.example", email);
    }
}
