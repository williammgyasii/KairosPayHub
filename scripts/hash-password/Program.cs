using Microsoft.AspNetCore.Identity;

if (args.Length == 0)
{
    Console.Error.WriteLine("Usage: dotnet run -- <password>");
    return 1;
}

Console.WriteLine(new PasswordHasher<object>().HashPassword(new object(), args[0]));
return 0;
