# Role: `freqtrade`

## How to use this Ansible role?

1. Create your private user_data repository

2. Configure your software variable on UI

```
strategy: MyCustomStrategy
config: myconfig
```

3. Configure your secret yaml configuration 

```
git_user_data:
  repo: http://mydomain.com/muser/myrepo.git
  version: latest
  token: s3cret!
```