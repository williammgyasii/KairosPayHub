namespace KairosPayHub.Api.Domain;

public enum Role
{
    Pastor,
    Leader,
}

public enum RecordStatus
{
    Submitted,
    Verified,
}

public enum PaymentMethod
{
    Cash,
    BankTransfer,
    MobileMoney,
    Other,
}

public enum RecordSource
{
    Manual,
    Online,
}
