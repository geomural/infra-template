const exec = require('@actions/exec');

const { TAG, OAUTH_TOKEN, ORG_ID, ISSUE_ID } = process.env;

const addComment = async () => {
    const headers = {
        Authorization: `OAuth ${OAUTH_TOKEN}`,
        "X-Org-ID": ORG_ID,
        "Content-Type": "application/json"
    };
    const comment = `Собрали образ в тегом ${TAG}`;
    const data = { text: comment };
    const url = `https://api.tracker.yandex.net/v2/issues/${ISSUE_ID}/comments`;

    const responce = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
    });

    if (!responce.ok) {
        throw Error(`Ошибка при добавлении комментария: ${responce.statusText}`);
    } else {
        console.log('Комментарий добавлен.');
    }
}

const buildDockerImage = async () => {
    console.log('Собираем docket-образ для тега:', TAG);
    try {
        await exec.exec('docker', ['build', '-t', `app:${TAG}`, '.']);
    } catch (e) {
        throw Error(`Ошибка при сборке docker-образа: ${e}`);
    }
    console.log('Docker-образ запущен на порту 3000.')

    await addComment();
}

buildDockerImage();
