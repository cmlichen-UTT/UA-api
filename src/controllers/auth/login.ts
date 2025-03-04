import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import bcrpyt from 'bcryptjs';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import { filterUser } from '../../utils/filters';
import { forbidden, success, unauthenticated } from '../../utils/responses';
import { generateToken } from '../../utils/users';
import { Error as ResponseError, UserType } from '../../types';
import { fetchUser } from '../../operations/user';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  ...isNotAuthenticated,
  validateBody(
    Joi.object({
      login: Joi.string().required().error(new Error(ResponseError.EmptyLogin)),
      password: validators.password.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { login, password } = request.body;

      // Fetch the user depending on the email or the username
      let field;
      if (!validators.email.validate(login).error) {
        field = 'email';
      } else if (!validators.username.validate(login).error) {
        field = 'username';
      } else {
        return unauthenticated(response, ResponseError.InvalidCredentials);
      }

      const user = await fetchUser(login, field);

      // Checks if the user exists
      if (!user) {
        return unauthenticated(response, ResponseError.InvalidCredentials);
      }

      if (user.registerToken) {
        return forbidden(response, ResponseError.EmailNotConfirmed);
      }

      if (user.type === UserType.attendant) {
        return forbidden(response, ResponseError.LoginAsAttendant);
      }

      // Compares the hash from the password given
      const isPasswordValid = await bcrpyt.compare(password, user.password);

      // If the password is not valid, rejects the request
      if (!isPasswordValid) {
        return unauthenticated(response, ResponseError.InvalidCredentials);
      }

      const token = generateToken(user);

      return success(response, {
        user: filterUser(user),
        token,
      });
    } catch (error) {
      return next(error);
    }
  },
];
