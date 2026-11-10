import { Router, type Router as RouterType } from 'express';
import { validate } from '../../common/middleware/validate.middleware.js';
import { catalogueController } from './catalogue.controller.js';
import { catalogueQuerySchema, productSlugSchema } from './catalogue.validation.js';

export const catalogueRouter: RouterType = Router();

catalogueRouter.get('/', validate(catalogueQuerySchema), catalogueController.list);
catalogueRouter.get('/:slug', validate(productSlugSchema), catalogueController.getBySlug);
