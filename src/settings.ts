import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin';

const settings: SettingSchemaDesc[] = [
    {
        key: 'autoUploading',
        type: 'boolean',
        title: 'auto Uploading',
        description: 'auto Uploading',
        default: true,
    },
    {
        key: 'uploadNetworkImage',
        type: 'boolean',
        title: 'Upload Image To PicGo Force',
        description: 'force to upload image to PicGo',
        default: false,
    },
    {
        key: 'homePath',
        type: 'string',
        title: 'User Home Path',
        description: 'Use Home Path, such as /Users/zhang',
        default: '',
    },
    {
        key: 'skipURLPrefix',
        type: 'string',
        title: 'Skip URL Prefix',
        description: 'skip upload image to PicGo by HTTPS URL prefix',
        default: 'https://cdn.jsdelivr.net/gh',
    },
];

export default settings;