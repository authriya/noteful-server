const path = require('path')
const express = require('express')
const xss = require('xss')
const logger = require('../logger')
const FolderService = require('./folder-service')

const folderRouter = express.Router()
const bodyParser = express.json()

const serializeFolders = folder => ({
    id: folder.id,
    name: xss(folder.name)
})

folderRouter
    .route('/api/folders')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        FolderService.getAllFolders(knexInstance)
            .then(folders => {
                res.json(folders.map(serializeFolders))
            })
            .catch(next)
    })
    .post(bodyParser, (req, res, next) => {
        if(!req.body.name) {
            logger.error(`Name is required`)
            return res.status(400).send({
                error: {message: `Name is required`}
            })
        }
        const {name} = req.body

        const newFolder = {name}

        FolderService.insertFolder(
            req.app.get('db'),
            newFolder
        )
            .then(folder => {
                logger.info(`Folder with id ${folder.id} created`)
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${folder.id}`))
                    .json(serializeFolders(folder))
            })
            .catch(next)
    })

    folderRouter
        .route('/api/folders/:folder_id')
        .all((req, res, next) => {
            const {folder_id} = req.params
            FolderService.getById(req.app.get('db'), folder_id)
                .then(folder => {
                    if(!folder) {
                        logger.error(`Folder with id ${folder_id} not found`)
                        return res.status(404).json({
                            error: {message: `Folder not found`}
                        })
                    }
                    res.folder = folder
                    next()
                })
                .catch(next)
        })
        .get((req, res, next)=> {
            res.json(serializeFolders(res.folder))
        })
        .delete((req, res, next) => {
            const {folder_id} = req.params

            FolderService.deleteFolder(
                req.app.get('db'),
                folder_id
            )
                .then(numRowsAffected => {
                    logger.info(`Folder with id ${folder_id} deleted`)
                    res.status(204).end()
                })
        })
        .patch(bodyParser, (req, res, next) => {
            const {name} = req.body
            const folderToUpdate = {name}

            if(!folderToUpdate.name) {
                return res.status(400).json({
                    error: {
                        message: `Request body must contain name`
                    }
                })
            }
            FolderService.updateFolder(
                req.app.get('db'),
                req.params.folder_id,
                folderToUpdate
            )
                .then(numRowsAffected => {
                    res.status(204).end()
                })
                .catch(next)
        })

module.exports = folderRouter