# AWS infrastructure (removed)

KairosPayHub no longer uses AWS. Authentication is handled by the .NET API on Render (ASP.NET Identity + JWT).

If a Cognito user pool still exists in your AWS account from an earlier deploy, delete it manually in the AWS Console (Cognito → User pools → `kairospayhub-users`) or run:

```bash
aws cognito-idp delete-user-pool --user-pool-id <pool-id>
```

Also remove the Cognito hosted UI domain if present.
