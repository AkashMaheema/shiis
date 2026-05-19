import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UserEntity } from './entities/user.entity';

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$/.test(value);
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) { }

  async login(loginDto: LoginDto) {
    const username = loginDto.username.trim();
    const password = loginDto.password;

    const user = await this.userRepository.findOne({
      where: {
        username,
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid username or password');
    }

    let isMatch = false;

    if (isBcryptHash(user.password)) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Legacy support: allow plain-text password once, then upgrade to bcrypt.
      isMatch = user.password === password;
      if (isMatch) {
        user.password = await bcrypt.hash(password, 12);
        await this.userRepository.save(user);
      }
    }

    if (!isMatch) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return {
      user: {
        id: user.userId,
        username: user.username,
        roleId: user.role?.roleId ?? null,
        roleName: user.role?.roleName ?? 'User',
      },
    };
  }
}
