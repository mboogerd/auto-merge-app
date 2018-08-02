# auto-merge-bot
![](flow-merge.png "Auto Merge Bot")
>  A GitHub App built with [Probot](https://github.com/probot/probot) that Automatically merges pull requests labeled merge-when-ready if all checks pass

## Running

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Installation

1. Register a Github App via https://github.com/settings/apps. Use a dummy Webhook URL and set a secure webhook secret
2. Once created copy the webhook secret and app id (see `About` section) to an `.env` file (see below)
3. In the section `Private key`, click the button to create and download one. Move the file in the repository (it should be picked up in subfolders, but from the root at least it works fine)
4. Build this bot as a docker image `docker build .`
5. Start the docker image as a container somewhere
6. Register the webhook URL (http://somewhere:3000) in your Github App configuration, so it knows where to dispatch events to.
7. Install the app in one or more repositories, to have the bot triggered for events in those repo's.

### .env file

This should be a file with contents as such:
```
# The ID of your GitHub App
APP_ID=1

# The webhook secret of your GitHub App
WEBHOOK_SECRET=replaceme

# Use `trace` to get verbose logging or `info` to show less
LOG_LEVEL=debug
```

## Contributing

If you have suggestions for how auto-merge-bot could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2018 Merlijn Boogerd <mlboogerd@gmail.com> (https://github.com/mboogerd)

## Logo
<div>Icons made by <a href="https://www.flaticon.com/authors/stephen-hutchings" title="Stephen Hutchings">Stephen Hutchings</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>